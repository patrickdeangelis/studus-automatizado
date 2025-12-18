import { Database } from 'bun:sqlite';

const dbPath = '/app/database/studus.db';
const db = new Database(dbPath);

console.log('Aplicando migração de performance...');

try {
  db.run("ALTER TABLE tasks ADD COLUMN performance TEXT;");
} catch (e) { console.log('Coluna performance já existe ou erro:', e); }

try {
  db.run("ALTER TABLE tasks ADD COLUMN started_at INTEGER;");
} catch (e) { console.log('Coluna started_at já existe ou erro:', e); }

try {
  db.run("ALTER TABLE tasks ADD COLUMN completed_at INTEGER;");
} catch (e) { console.log('Coluna completed_at já existe ou erro:', e); }

console.log('Migração concluída.');
process.exit(0);
