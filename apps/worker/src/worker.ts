import { Worker } from 'bullmq';
import { db } from './db';
import { tasks } from './db/schema';
import { eq } from 'drizzle-orm';
import { StudusBrowser } from './automation/browser';

// Processors
import { processLogin } from './processors/login';
import { processSync } from './processors/sync';

console.log('Worker Starting...');

const worker = new Worker('studus-tasks', async job => {
  console.log(`Processing Job ${job.id} (${job.name})`);
  const { taskId } = job.data;
  
  try {
    // Update DB status -> RUNNING
    if (taskId) {
        await db.update(tasks).set({ status: 'RUNNING' }).where(eq(tasks.id, taskId));
    }

    let result;
    if (job.name === 'LOGIN') {
        result = await processLogin(job);
    } else if (job.name === 'SYNC_DISCIPLINES') {
        result = await processSync(job);
    }

    // Update DB status -> COMPLETED
    if (taskId) {
        await db.update(tasks).set({ 
            status: 'COMPLETED',
            result: JSON.stringify(result),
            progress: 100
        }).where(eq(tasks.id, taskId));
    }
    
    return result;

  } catch (error: any) {
      console.error(`Job ${job.id} Failed:`, error);
      
      // Update DB status -> FAILED
      if (taskId) {
        await db.update(tasks).set({ 
            status: 'FAILED',
            result: JSON.stringify({ error: error.message }) 
        }).where(eq(tasks.id, taskId));
      }
      throw error;
  }
}, { 
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null
  }
});

worker.on('ready', () => console.log('Worker Ready! Listening for jobs...'));
worker.on('error', err => console.error('Worker Error:', err));
