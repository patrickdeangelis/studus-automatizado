import { Elysia } from 'elysia';
import { sign, verify } from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Tipos para o payload JWT
export interface JWTPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

// Configuração JWT
const JWT_SECRET = process.env.JWT_SECRET || 'studus-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Gera um token JWT para o usuário
 */
export const generateToken = (user: { id: number; username: string }): string => {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username
  };

  return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifica e decodifica um token JWT
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    return verify(token, JWT_SECRET) as JWTPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw new Error('Erro na verificação do token');
    }
  }
};

/**
 * Middleware para extrair usuário do token JWT
 */
export const authenticate = async ({ headers, set }: { headers: Record<string, string>; set: any }) => {
  const authHeader = headers.authorization;

  if (!authHeader) {
    set.status = 401;
    throw new Error('Token de autenticação não fornecido');
  }

  // Formato esperado: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    set.status = 401;
    throw new Error('Formato de token inválido. Use: Bearer <token>');
  }

  const token = parts[1];

  try {
    // Verificar token
    const payload = verifyToken(token);

    // Buscar usuário no banco para garantir que ainda existe
    const user = await db
      .select({
        id: users.id,
        username: users.username,
        studusUsername: users.studusUsername
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user.length) {
      set.status = 401;
      throw new Error('Usuário não encontrado');
    }

    // Adicionar usuário ao contexto
    return {
      user: user[0],
      token: token
    };
  } catch (error: any) {
    set.status = 401;
    throw error;
  }
};

/**
 * Plugin Elysia para autenticação
 */
export const authPlugin = (app: Elysia) =>
  app
    .derive(({ headers, set }) => authenticate({ headers, set }))
    .error({
      UNAUTHORIZED: (error) => ({
        success: false,
        error: 'Não autorizado',
        message: error.message
      })
    })
    .onError(({ error, set }) => {
      if (error.message.includes('Token') || error.message.includes('Não autorizado')) {
        set.status = 401;
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: error.message
        };
      }
    });

/**
 * Middleware opcional - não falha se não houver token
 */
export const optionalAuth = async ({ headers }: { headers: Record<string, string> }) => {
  const authHeader = headers.authorization;

  if (!authHeader) {
    return { user: null, token: null };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { user: null, token: null };
  }

  try {
    const token = parts[1];
    const payload = verifyToken(token);

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        studusUsername: users.studusUsername
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return {
      user: user.length ? user[0] : null,
      token: token
    };
  } catch {
    return { user: null, token: null };
  }
};

/**
 * Middleware de autenticação para Elysia
 */
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ headers, set }) => {
    const authHeader = headers.authorization;

    if (!authHeader) {
      set.status = 401;
      throw new Error('Token de autenticação não fornecido');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      set.status = 401;
      throw new Error('Formato de token inválido. Use: Bearer <token>');
    }

    const token = parts[1];

    try {
      const payload = verifyToken(token);
      return { userId: payload.userId, username: payload.username };
    } catch (error: any) {
      set.status = 401;
      throw new Error('Token inválido ou expirado');
    }
  });