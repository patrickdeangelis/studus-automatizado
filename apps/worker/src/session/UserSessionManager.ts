/**
 * User Session Manager
 * Gerencia múltiplos contextos de navegador para diferentes usuários
 */
import { Browser, BrowserContext, Page } from 'playwright';
import { Redis } from 'ioredis';

interface SessionInfo {
  userId: number;
  context: BrowserContext;
  lastUsed: number;
  isActive: boolean;
}

class UserSessionManager {
  private browser: Browser | null = null;
  private sessions: Map<number, SessionInfo> = new Map();
  private redis: Redis;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  private readonly MAX_SESSIONS = 10; // Limite de sessões simultâneas

  constructor() {
    // Conectar ao Redis para cache de sessões
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Limpar sessões expiradas periodicamente
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // A cada 5 minutos
  }

  /**
   * Inicializa o navegador se ainda não estiver iniciado
   */
  private async ensureBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const { chromium } = await import('playwright');
      this.browser = await chromium.launch({
        headless: process.env.NODE_ENV === 'production' ? true : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      console.log('[SessionManager] Browser initialized');
    }
    return this.browser;
  }

  /**
   * Cria ou obtém uma sessão para o usuário
   */
  async getSession(userId: number): Promise<BrowserContext> {
    // Verificar se já existe sessão ativa
    const existingSession = this.sessions.get(userId);
    if (existingSession && existingSession.isActive) {
      existingSession.lastUsed = Date.now();
      console.log(`[SessionManager] Reusing existing session for user ${userId}`);
      return existingSession.context;
    }

    // Verificar limite de sessões
    if (this.sessions.size >= this.MAX_SESSIONS) {
      await this.cleanupOldestSession();
    }

    // Criar nova sessão
    const browser = await this.ensureBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 }
    });

    const sessionInfo: SessionInfo = {
      userId,
      context,
      lastUsed: Date.now(),
      isActive: true
    };

    this.sessions.set(userId, sessionInfo);
    console.log(`[SessionManager] Created new session for user ${userId}`);

    // Tentar restaurar sessão do cache Redis
    await this.restoreSessionFromCache(userId, context);

    return context;
  }

  /**
   * Salva cookies da sessão no Redis
   */
  async saveSessionCookies(userId: number, context: BrowserContext): Promise<void> {
    try {
      const cookies = await context.cookies();
      await this.redis.setex(
        `session_cookies:${userId}`,
        this.SESSION_TIMEOUT / 1000,
        JSON.stringify(cookies)
      );
      console.log(`[SessionManager] Saved cookies for user ${userId}`);
    } catch (error) {
      console.error(`[SessionManager] Error saving cookies for user ${userId}:`, error);
    }
  }

  /**
   * Restaura cookies do Redis para a sessão
   */
  private async restoreSessionFromCache(userId: number, context: BrowserContext): Promise<void> {
    try {
      const cachedCookies = await this.redis.get(`session_cookies:${userId}`);
      if (cachedCookies) {
        const cookies = JSON.parse(cachedCookies);
        await context.addCookies(cookies);
        console.log(`[SessionManager] Restored cookies for user ${userId}`);
      }
    } catch (error) {
      console.error(`[SessionManager] Error restoring cookies for user ${userId}:`, error);
    }
  }

  /**
   * Verifica se a sessão do Studus ainda está válida
   */
  async validateSession(userId: number): Promise<boolean> {
    try {
      const context = await this.getSession(userId);
      const page = await context.newPage();

      const response = await page.goto('https://www.studus.com.br/StudusFIP/pages/inicial.jsf', {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      const isValid = response && !response.url().includes('login.xhtml');
      await page.close();

      if (!isValid) {
        // Sessão inválida, limpar cookies
        await this.clearSession(userId);
      }

      return isValid;
    } catch (error) {
      console.error(`[SessionManager] Error validating session for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Limpa uma sessão específica
   */
  async clearSession(userId: number): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      await session.context.close();
      this.sessions.delete(userId);
    }

    // Limpar cookies do Redis
    await this.redis.del(`session_cookies:${userId}`);
    console.log(`[SessionManager] Cleared session for user ${userId}`);
  }

  /**
   * Limpa todas as sessões
   */
  async clearAllSessions(): Promise<void> {
    console.log(`[SessionManager] Clearing all sessions...`);

    for (const [userId, session] of this.sessions.entries()) {
      await session.context.close();
    }
    this.sessions.clear();

    // Limpar todos os cookies do Redis
    const keys = await this.redis.keys('session_cookies:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    console.log(`[SessionManager] All sessions cleared`);
  }

  /**
   * Remove a sessão mais antiga
   */
  private async cleanupOldestSession(): Promise<void> {
    let oldestUserId: number | null = null;
    let oldestTime = Date.now();

    for (const [userId, session] of this.sessions.entries()) {
      if (session.lastUsed < oldestTime) {
        oldestTime = session.lastUsed;
        oldestUserId = userId;
      }
    }

    if (oldestUserId !== null) {
      await this.clearSession(oldestUserId);
      console.log(`[SessionManager] Cleaned up oldest session: user ${oldestUserId}`);
    }
  }

  /**
   * Remove sessões expiradas
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredUsers: number[] = [];

    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastUsed > this.SESSION_TIMEOUT) {
        expiredUsers.push(userId);
      }
    }

    for (const userId of expiredUsers) {
      await this.clearSession(userId);
      console.log(`[SessionManager] Cleaned up expired session: user ${userId}`);
    }
  }

  /**
   * Obtém estatísticas das sessões
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    memoryUsage: string;
  } {
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.isActive).length;

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Fecha o navegador e todas as sessões
   */
  async shutdown(): Promise<void> {
    console.log(`[SessionManager] Shutting down...`);

    await this.clearAllSessions();

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    if (this.redis) {
      await this.redis.quit();
    }

    console.log(`[SessionManager] Shutdown complete`);
  }
}

// Singleton instance
export const userSessionManager = new UserSessionManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down UserSessionManager...');
  await userSessionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down UserSessionManager...');
  await userSessionManager.shutdown();
  process.exit(0);
});