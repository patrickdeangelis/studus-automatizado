import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { authRoutes } from './routes/auth';
import { taskRoutes } from './routes/tasks';
import { disciplineRoutes } from './routes/disciplines';
import { settingsRoutes } from './routes/settings';
import { healthRoutes } from './routes/health';

const app = new Elysia()
  .use(cors())
  .use(swagger())
  // Rotas públicas (sem autenticação)
  .use(authRoutes)
  .use(healthRoutes)
  // Rotas protegidas (com autenticação própria)
  .use(taskRoutes)
  .use(disciplineRoutes)
  .use(settingsRoutes)
  .get('/', () => 'Hello Studus API')
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
