import { Elysia } from 'elysia';

// Interface para armazenamento de requisições
interface RequestRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// Store em memória (Em produção, usar Redis)
const requestStore = new Map<string, RequestRecord>();

// Configurações padrão
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const DEFAULT_MAX_REQUESTS = 100; // 100 requisições por janela

/**
 * Configurações de rate limiting
 */
interface RateLimitConfig {
  windowMs?: number; // Janela de tempo em ms
  max?: number; // Máximo de requisições por janela
  message?: string; // Mensagem de erro personalizada
  skipSuccessfulRequests?: boolean; // Não contar requisições bem-sucedidas
  skipFailedRequests?: boolean; // Não contar requisições falhas
  keyGenerator?: (headers: Record<string, string>) => string; // Gerador de chave customizado
}

/**
 * Cria um middleware de rate limiting
 */
export const createRateLimit = (config: RateLimitConfig = {}) => {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    max = DEFAULT_MAX_REQUESTS,
    message = 'Muitas requisições. Tente novamente mais tarde.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (headers) => {
      // Usar IP como chave padrão
      return headers['x-forwarded-for'] ||
             headers['x-real-ip'] ||
             'unknown';
    }
  } = config;

  return ({ headers, set, request }: {
    headers: Record<string, string>;
    set: any;
    request: Request;
  }) => {
    const key = keyGenerator(headers);
    const now = Date.now();

    // Obter ou criar registro
    let record = requestStore.get(key);

    if (!record || now > record.resetTime) {
      // Novo registro ou janela expirada
      record = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now
      };
      requestStore.set(key, record);
    }

    // Incrementar contador
    record.count++;
    record.lastRequest = now;

    // Verificar limite
    if (record.count > max) {
      set.status = 429;
      set.headers['Retry-After'] = Math.ceil((record.resetTime - now) / 1000).toString();

      throw new Error(message);
    }

    // Adicionar headers de rate limiting
    set.headers['X-RateLimit-Limit'] = max.toString();
    set.headers['X-RateLimit-Remaining'] = Math.max(0, max - record.count).toString();
    set.headers['X-RateLimit-Reset'] = new Date(record.resetTime).toISOString();

    return {
      rateLimit: {
        limit: max,
        remaining: Math.max(0, max - record.count),
        reset: record.resetTime
      }
    };
  };
};

/**
 * Rate limiting específico para endpoints sensíveis
 */
export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 requisições por minuto
  message: 'Limite de requisições excedido para este endpoint. Aguarde um minuto.'
});

/**
 * Rate limiting para autenticação (mais restrito)
 */
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login por 15 minutos
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  keyGenerator: (headers) => {
    const ip = headers['x-forwarded-for'] ||
               headers['x-real-ip'] ||
               'unknown';
    const userAgent = headers['user-agent'] || 'unknown';
    // Combinar IP com User-Agent para dificultar bypass
    return `auth:${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 16)}`;
  }
});

/**
 * Rate limiting baseado em usuário (se autenticado)
 */
export const userRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto por usuário
  keyGenerator: (headers) => {
    // Se tiver token JWT, usar userId
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const { verify } = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'studus-secret-key-change-in-production';
        const decoded = verify(authHeader.slice(7), JWT_SECRET) as any;
        return `user:${decoded.userId}`;
      } catch {
        // Token inválido, voltar para IP
      }
    }

    // Fallback para IP
    const ip = headers['x-forwarded-for'] ||
               headers['x-real-ip'] ||
               'unknown';
    return `ip:${ip}`;
  }
});

/**
* Limpa registros expirados (rodar periodicamente)
*/
export const cleanupExpiredRecords = () => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
};

// Rodar cleanup a cada 5 minutos
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

/**
 * Plugin Elysia para rate limiting global
 */
export const rateLimitPlugin = (config?: RateLimitConfig) => {
  const middleware = createRateLimit(config);

  return (app: Elysia) =>
    app
      .derive(middleware)
      .error({
        RATE_LIMIT_EXCEEDED: (error) => ({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: error.message
        })
      })
      .onError(({ error, set }) => {
        if (error.message.includes('Limite de requisições') ||
            error.message.includes('Muitas tentativas') ||
            error.message.includes('Muitas requisições')) {
          set.status = 429;
          return {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: error.message
          };
        }
      });
};