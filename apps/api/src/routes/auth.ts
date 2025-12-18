import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { generateToken } from '../middleware/auth';
import { studusAuthService } from '../services/studusAuth';
import { hash } from 'bcrypt';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post(
    '/login',
    async ({ body, set }) => {
      const { username, password } = body;

      if (!username || !password) {
        set.status = 400;
        return {
          success: false,
          error: 'BAD_REQUEST',
          message: 'Usuário e senha são obrigatórios'
        };
      }

      try {
        // Validar credenciais no Studus
        const validationResult = await studusAuthService.validateCredentials(username, password);

        if (!validationResult.success) {
          set.status = 401;
          return {
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: validationResult.error || 'Credenciais do Studus inválidas'
          };
        }

        // Verificar se usuário já existe pelo StudusUsername
        let user = await db
          .select()
          .from(users)
          .where(eq(users.studusUsername, username))
          .limit(1);

        // Se não existe, criar novo usuário (auto-cadastro)
        if (user.length === 0) {
          const hashedPassword = await hash(password, 10);

          const insertResult = await db.insert(users).values({
            studusUsername: username,
            studusPassword: password, // Será criptografado pelo worker
            password: hashedPassword, // Senha para nosso sistema (baseado na senha do Studus)
            encrypted: false, // Será criptografada pelo worker
            username: username, // Usar mesmo username do Studus
          }).returning();

          user = await db
            .select()
            .from(users)
            .where(eq(users.id, insertResult.lastInsertRowid))
            .limit(1);
        } else {
          // Usuário existe, verificar se precisa atualizar senha do Studus
          const shouldUpdateStudusPassword = !user[0].studusPassword ||
                                          (user[0].encrypted === false && user[0].studusPassword !== password);

          if (shouldUpdateStudusPassword) {
            await db
              .update(users)
              .set({
                studusPassword: password,
                encrypted: false,
                updatedAt: new Date().toISOString()
              })
              .where(eq(users.id, user[0].id));
          }
        }

        // Gerar token JWT
        const token = generateToken({
          id: user[0].id,
          username: user[0].username
        });

        return {
          success: true,
          data: {
            token,
            user: {
              id: user[0].id,
              username: user[0].username,
              studusUsername: user[0].studusUsername,
              userInfo: validationResult.userInfo
            },
            isNewUser: !user[0].studusPassword || user[0].encrypted === false
          },
          message: validationResult.userInfo
            ? `Bem-vindo, ${validationResult.userInfo.name}!`
            : 'Login realizado com sucesso'
        };
      } catch (error) {
        console.error('Login error:', error);
        set.status = 500;
        return {
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Erro interno no servidor'
        };
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String()
      }),
      detail: {
        tags: ['Autenticação'],
        summary: 'Login com credenciais do Studus',
        description: 'Valida credenciais no portal Studus e cria/atualiza usuário'
      }
    }
  )

  .post(
    '/refresh',
    async ({ headers, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader) {
        set.status = 401;
        return {
          success: false,
          error: 'NO_TOKEN',
          message: 'Token não fornecido'
        };
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        set.status = 401;
        return {
          success: false,
          error: 'INVALID_TOKEN_FORMAT',
          message: 'Formato do token inválido'
        };
      }

      const oldToken = parts[1];

      try {
        // Verificar token antigo
        const { verify } = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'studus-secret-key-change-in-production';

        const decoded = verify(oldToken, JWT_SECRET) as any;

        // Buscar usuário atualizado
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (!user.length) {
          set.status = 401;
          return {
            success: false,
            error: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
          };
        }

        // Gerar novo token
        const newToken = generateToken({
          id: user[0].id,
          username: user[0].username
        });

        return {
          success: true,
          data: {
            token: newToken
          },
          message: 'Token renovado com sucesso'
        };
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token inválido ou expirado'
        };
      }
    },
    {
      detail: {
        tags: ['Autenticação'],
        summary: 'Renovar token',
        description: 'Renova um token JWT expirado'
      }
    }
  )

  .post(
    '/logout',
    async ({ headers, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader) {
        set.status = 401;
        return {
          success: false,
          error: 'NO_TOKEN',
          message: 'Token não fornecido'
        };
      }

      try {
        const { verify } = await import('jsonwebtoken');
        const JWT_SECRET = process.envJWT_SECRET || 'studus-secret-key-change-in-production';
        const decoded = verify(authHeader.split(' ')[1], JWT_SECRET);
        const userId = (decoded as any).userId;

        // Limpar cache do usuário
        await studusAuthService.clearUserCache(userId);

        return {
          success: true,
          message: 'Logout realizado com sucesso'
        };
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token inválido'
        };
      }
    },
    {
      detail: {
        tags: ['Autenticação'],
        summary: 'Logout',
        description: 'Finaliza a sessão do usuário (tratado no cliente)'
      }
    }
  )

  .get(
    '/me',
    async ({ headers, set }) => {
      const authHeader = headers.authorization;

      if (!authHeader) {
        set.status = 401;
        return {
          success: false,
          error: 'NO_TOKEN',
          message: 'Token não fornecido'
        };
      }

      try {
        const { verify } = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'studus-secret-key-change-in-production';
        const decoded = verify(authHeader.split(' ')[1], JWT_SECRET);
        const userId = (decoded as any).userId;

        const user = await db
          .select({
            id: users.id,
            username: users.username,
            studusUsername: users.studusUsername,
            createdAt: users.createdAt
          })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (!user.length) {
          set.status = 401;
          return {
            success: false,
            error: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
          };
        }

        return {
          success: true,
          data: user[0]
        };
      } catch (error) {
        set.status = 401;
        return {
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Token inválido'
        };
      }
    },
    {
      detail: {
        tags: ['Autenticação'],
        summary: 'Dados do usuário',
        description: 'Retorna informações do usuário logado'
      }
    }
  );