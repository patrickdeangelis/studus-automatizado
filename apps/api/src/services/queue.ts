import { Queue } from 'bullmq';
import { redis } from './redis';

export const taskQueue = new Queue('studus-tasks', { connection: redis });

export const addLoginTask = async (payload: { username?: string; password?: string; taskId: number }) => {
  return await taskQueue.add('LOGIN', payload);
};

export const addSyncTask = async (payload: { userId: number; taskId: number }) => {
  return await taskQueue.add('SYNC_DISCIPLINES', payload);
};