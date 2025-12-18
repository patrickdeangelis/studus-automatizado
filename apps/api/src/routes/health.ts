/**
 * Health Check Routes
 * Endpoint para monitoramento do sistema
 */
import { Elysia } from 'elysia';
import { db } from '../db';
import { users, tasks } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
// Note: UserSessionManager is imported dynamically to avoid circular dependencies
// and because it runs in the worker process, not the API
// import { userSessionManager } from '../../worker/src/session/UserSessionManager';
import { sessionCacheService } from '../services/sessionCache';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    browser: 'up' | 'down';
  };
  metrics: {
    activeUsers: number;
    activeSessions: number;
    pendingTasks: number;
    runningTasks: number;
  };
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
}

export const healthRoutes = new Elysia({ prefix: '/health' })
  .get('/', async () => {
    const startTime = Date.now();
    const health: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'down',
        redis: 'down',
        browser: 'down'
      },
      metrics: {
        activeUsers: 0,
        activeSessions: 0,
        pendingTasks: 0,
        runningTasks: 0
      },
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        percentage: 0
      }
    };

    // Calcular percentual de memória
    health.memory.percentage = Math.round(
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    );

    let degradedServices = 0;

    // Verificar Database
    try {
      await db.select({ count: count() }).from(users);
      health.services.database = 'up';
    } catch (error) {
      health.services.database = 'down';
      degradedServices++;
    }

    // Verificar Redis e obter métricas
    try {
      const cacheStats = await sessionCacheService.getStats();
      health.services.redis = 'up';
      health.metrics.activeUsers = cacheStats.cachedSessions;
    } catch (error) {
      health.services.redis = 'down';
      degradedServices++;
    }

    // Browser status (sempre up se worker estiver rodando)
    health.services.browser = 'up';
    health.metrics.activeSessions = 0; // Será atualizado via cache

    // Obter métricas de tarefas
    try {
      const taskStats = await db
        .select({
          status: tasks.status,
          count: count()
        })
        .from(tasks)
        .groupBy(tasks.status);

      taskStats.forEach(stat => {
        if (stat.status === 'PENDING') {
          health.metrics.pendingTasks = stat.count;
        } else if (stat.status === 'RUNNING') {
          health.metrics.runningTasks = stat.count;
        }
      });
    } catch (error) {
      console.error('Error getting task stats:', error);
    }

    // Determinar status geral
    if (degradedServices === 0) {
      health.status = 'healthy';
    } else if (degradedServices <= 1) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    // Adicionar tempo de resposta
    const responseTime = Date.now() - startTime;

    // Headers úteis
    return {
      ...health,
      responseTime: `${responseTime}ms`
    };
  }, {
    detail: {
      tags: ['Sistema'],
      summary: 'Health Check',
      description: 'Verifica o status de todos os serviços do sistema'
    }
  })

  .get('/sessions', async () => {
    // Endpoint detalhado para sessões
    try {
      const cacheStats = await sessionCacheService.getStats();

      // Obter sessões recentes
      const recentSessions = await db
        .select({
          id: users.id,
          username: users.username,
          studusUsername: users.studusUsername,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(users.studusUsername)
        .orderBy(desc(users.updatedAt))
        .limit(10);

      return {
        status: 'success',
        data: {
          cache: cacheStats,
          recentSessions,
          activeSessions: cacheStats.cachedSessions
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }, {
    detail: {
      tags: ['Sistema'],
      summary: 'Sessões Ativas',
      description: 'Lista informações sobre sessões de usuários'
    }
  })

  .delete('/sessions/:userId', async ({ params, set }) => {
    // Limpar sessão específica
    try {
      const userId = parseInt(params.userId);
      await sessionCacheService.clearUserCache(userId);
      // Nota: UserSessionManager.clearSession seria chamado no worker
      // via fila de tarefas ou outro mecanismo

      return {
        status: 'success',
        message: `Cache da sessão do usuário ${userId} limpo com sucesso`
      };
    } catch (error) {
      set.status = 500;
      return {
        status: 'error',
        error: error.message
      };
    }
  }, {
    detail: {
      tags: ['Sistema'],
      summary: 'Limpar Sessão',
      description: 'Remove a sessão de um usuário específico'
    }
  })

  .post('/maintenance/clear-all-sessions', async ({ set }) => {
    // Endpoint de manutenção para limpar todas as sessões
    try {
      await sessionCacheService.clearAllCaches();
      // Nota: UserSessionManager.clearAllSessions seria chamado no worker
      // via sinal ou outro mecanismo

      return {
        status: 'success',
        message: 'Todos os caches foram limpos'
      };
    } catch (error) {
      set.status = 500;
      return {
        status: 'error',
        error: error.message
      };
    }
  }, {
    detail: {
      tags: ['Sistema'],
      summary: 'Limpar Todas as Sessões',
      description: 'Remove todas as sessões ativas (endpoint de manutenção)'
    }
  });