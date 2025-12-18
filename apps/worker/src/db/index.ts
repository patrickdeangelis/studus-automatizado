import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import path from 'path';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/root/projects/studus_automatizado/database/studus.db';
console.log('Opening DB at:', dbPath);

const sqlite = new Database(dbPath, { create: true });
export const db = drizzle(sqlite, { schema });
