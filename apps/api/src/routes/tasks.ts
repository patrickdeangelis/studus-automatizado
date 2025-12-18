import { Elysia, t } from 'elysia';
import { db } from '../db';
import { tasks } from '../db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { addSyncTask, addLoginTask } from '../services/queue';
import { Mutex } from '../services/mutex';
import { authMiddleware } from '../middleware/auth';

export const taskRoutes = new Elysia({ prefix: '/tasks' })
  .use(authMiddleware)
  .get('/', async ({ userId }) => {
    return await db.select().from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt))
      .limit(50);
  })
  .get('/stats/performance', async ({ userId }) => {
    // Calculate Average Sync Time
    const completedTasks = await db.select({
        performance: tasks.performance,
        completedAt: tasks.completedAt
    }).from(tasks)
    .where(and(
        eq(tasks.type, 'SYNC_DISCIPLINES'),
        eq(tasks.status, 'COMPLETED'),
        eq(tasks.userId, userId)
    ))
    .orderBy(desc(tasks.completedAt)) // Ensure we get the latest
    .limit(10); 

    const lastSuccess = completedTasks.length > 0 ? completedTasks[0].completedAt : null;

    if (completedTasks.length === 0) {
        return { averageTime: 0, sampleSize: 0, lastSuccess: null };
    }

    let totalTime = 0;
    let count = 0;

    for (const t of completedTasks) {
        if (t.performance) {
            try {
                const perf = JSON.parse(t.performance as string);
                if (perf.total) {
                    totalTime += perf.total;
                    count++;
                }
            } catch (e) {}
        }
    }

    return { 
        averageTime: count > 0 ? Math.round(totalTime / count) : 0, 
        sampleSize: count,
        lastSuccess
    };
  })
  .post('/', async ({ body, set, userId }) => {
    const { type, payload } = body;

    console.log(`[API] Received Task Request: ${type} for User: ${userId}`);

    // Prevent concurrent SYNC tasks using a Critical Section Mutex
    if (type === 'SYNC_DISCIPLINES') {
      const mutex = new Mutex(`sync_creation_${userId}`, 5); // 5s lock per user

      try {
        const result = await mutex.runExclusive(async () => {
            // Double-check DB state inside the lock
            const activeTasks = await db.select().from(tasks).where(
                and(
                eq(tasks.type, 'SYNC_DISCIPLINES'),
                eq(tasks.userId, userId),
                or(eq(tasks.status, 'PENDING'), eq(tasks.status, 'RUNNING'))
                )
            );

            if (activeTasks.length > 0) {
                console.warn(`[API] REJECTED Sync Request: Active task found (ID: ${activeTasks[0].id})`);
                return { status: 409, error: 'Já existe uma sincronização em andamento.' };
            }

            // Create Task
            const [inserted] = await db.insert(tasks).values({
                type,
                status: 'PENDING',
                payload: JSON.stringify(payload || {}),
                userId: userId
            }).returning();

            await addSyncTask({ userId, taskId: inserted.id });
            console.log(`[API] ACCEPTED Sync Request: Created Task ID ${inserted.id}`);

            return inserted;
        });

        if ('error' in result) {
            set.status = result.status;
            return result;
        }
        return result;

      } catch (err) {
          // Mutex contention (Could not acquire lock)
          console.warn(`[API] REJECTED Sync Request: Concurrency Lock Contention`);
          set.status = 429; // Too Many Requests
          return { error: 'O sistema está ocupado processando outra solicitação. Tente novamente.' };
      }
    }

    // Standard Logic for other tasks (Login)
    const [inserted] = await db.insert(tasks).values({
      type,
      status: 'PENDING',
      payload: JSON.stringify(payload || {}),
      userId: userId
    }).returning();

    if (type === 'LOGIN') {
      await addLoginTask({ ...payload, userId, taskId: inserted.id });
    }

    return inserted;
  }, {
    body: t.Object({
      type: t.Union([t.Literal('LOGIN'), t.Literal('SYNC_DISCIPLINES')]),
      payload: t.Optional(t.Any()),
    })
  });
