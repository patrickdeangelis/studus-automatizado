/**
 * Session Cache Service
 * Gerencia cache inteligente de sessões do Studus
 */
import { Redis } from 'ioredis';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { userSessionManager } from '../../worker/src/session/UserSessionManager';

interface SessionStatus {
  isValid: boolean;
  lastChecked: number;
  cookies?: any[];
}

class SessionCacheService {
  private redis: Redis;
  private readonly CACHE_TTL = 15 * 60; // 15 minutos
  private readonly CHECK_INTERVAL = 5 * 60; // Verificar a cada 5 minutos se necessário

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Verifica se a sessão do usuário é válida
   * Usa cache para evitar verificações desnecessárias
   */
  async isSessionValid(userId: number): Promise<boolean> {
    const cacheKey = `session_status:${userId}`;

    try {
      // Verificar cache primeiro
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const sessionStatus: SessionStatus = JSON.parse(cached);
        const now = Date.now();

        // Se verificado recentemente, retornar do cache
        if (now - sessionStatus.lastChecked < this.CHECK_INTERVAL * 1000) {
          console.log(`[SessionCache] Using cached status for user ${userId}: ${sessionStatus.isValid}`);
          return sessionStatus.isValid;
        }
      }

      // Verificar sessão real
      console.log(`[SessionCache] Checking session validity for user ${userId}`);
      const isValid = await userSessionManager.validateSession(userId);

      // Atualizar cache
      const sessionStatus: SessionStatus = {
        isValid,
        lastChecked: Date.now()
      };

      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(sessionStatus)
      );

      console.log(`[SessionCache] Session ${isValid ? 'valid' : 'invalid'} for user ${userId}`);
      return isValid;

    } catch (error) {
      console.error(`[SessionCache] Error checking session for user ${userId}:`, error);
      // Em caso de erro, assumir que precisa de login
      return false;
    }
  }

  /**
   * Invalida o cache de sessão forçando nova verificação
   */
  async invalidateSessionCache(userId: number): Promise<void> {
    const cacheKey = `session_status:${userId}`;
    await this.redis.del(cacheKey);
    console.log(`[SessionCache] Invalidated cache for user ${userId}`);
  }

  /**
   * Obtém cookies armazenados do usuário
   */
  async getUserCookies(userId: number): Promise<any[] | null> {
    try {
      // Primeiro tentar do Redis (mais recente)
      const redisCookies = await this.redis.get(`session_cookies:${userId}`);
      if (redisCookies) {
        return JSON.parse(redisCookies);
      }

      // Se não tiver no Redis, buscar do banco
      const dbUser = await db
        .select({ cookies: users.cookies })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (dbUser.length > 0 && dbUser[0].cookies) {
        try {
          const cookies = JSON.parse(dbUser[0].cookies);
          // Salvar no Redis para acesso rápido
          await this.redis.setex(
            `session_cookies:${userId}`,
            this.CACHE_TTL,
            JSON.stringify(cookies)
          );
          return cookies;
        } catch (e) {
          console.error(`[SessionCache] Error parsing cookies from DB for user ${userId}:`, e);
        }
      }

      return null;
    } catch (error) {
      console.error(`[SessionCache] Error getting cookies for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Salva cookies do usuário no cache
   */
  async saveUserCookies(userId: number, cookies: any[]): Promise<void> {
    try {
      // Salvar no Redis
      await this.redis.setex(
        `session_cookies:${userId}`,
        this.CACHE_TTL,
        JSON.stringify(cookies)
      );

      // Opcional: também salvar no DB como backup
      await db.update(users)
        .set({
          cookies: JSON.stringify(cookies),
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`[SessionCache] Saved ${cookies.length} cookies for user ${userId}`);
    } catch (error) {
      console.error(`[SessionCache] Error saving cookies for user ${userId}:`, error);
    }
  }

  /**
   * Limpa todos os caches de um usuário
   */
  async clearUserCache(userId: number): Promise<void> {
    const keys = [
      `session_status:${userId}`,
      `session_cookies:${userId}`
    ];

    await this.redis.del(...keys);
    console.log(`[SessionCache] Cleared all cache for user ${userId}`);
  }

  /**
   * Verifica se usuário precisa fazer login antes de executar tarefa
   */
  async requiresLogin(userId: number): Promise<boolean> {
    // Verificar se tem cookies armazenados
    const cookies = await this.getUserCookies(userId);
    if (!cookies || cookies.length === 0) {
      console.log(`[SessionCache] No cookies found for user ${userId}, login required`);
      return true;
    }

    // Verificar validade da sessão
    const isValid = await this.isSessionValid(userId);
    if (!isValid) {
      console.log(`[SessionCache] Invalid session for user ${userId}, login required`);
      return true;
    }

    return false;
  }

  /**
   * Prepara sessão para execução de tarefa
   * Retorna true se sessão está pronta, false se precisa de login
   */
  async prepareSession(userId: number): Promise<boolean> {
    const requiresLogin = await this.requiresLogin(userId);

    if (!requiresLogin) {
      // Sessão válida, restaurar cookies se necessário
      const context = await userSessionManager.getSession(userId);
      const cookies = await this.getUserCookies(userId);

      if (cookies) {
        try {
          // Limpar cookies existentes e adicionar os salvos
          await context.clearCookies();
          await context.addCookies(cookies);
          console.log(`[SessionCache] Restored ${cookies.length} cookies for user ${userId}`);
        } catch (error) {
          console.error(`[SessionCache] Error restoring cookies for user ${userId}:`, error);
          return false;
        }
      }
    }

    return !requiresLogin;
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<{
    cachedSessions: number;
    cachedCookies: number;
    memoryUsage: string;
  }> {
    const sessionKeys = await this.redis.keys('session_status:*');
    const cookieKeys = await this.redis.keys('session_cookies:*');

    return {
      cachedSessions: sessionKeys.length,
      cachedCookies: cookieKeys.length,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Limpa todos os caches
   */
  async clearAllCaches(): Promise<void> {
    const keys = await this.redis.keys('session_*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    console.log(`[SessionCache] Cleared all session caches (${keys.length} keys)`);
  }
}

// Singleton instance
export const sessionCacheService = new SessionCacheService();