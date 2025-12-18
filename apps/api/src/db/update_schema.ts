import { Database } from 'bun:sqlite';

const db = new Database('./database/studus.db');

try {
  // Verificar se a coluna encrypted já existe
  const tableInfo = db.query("PRAGMA table_info(users)").all() as any[];
  const hasEncrypted = tableInfo.some(col => col.name === 'encrypted');
  const hasUpdatedAt = tableInfo.some(col => col.name === 'updated_at');

  if (!hasEncrypted) {
    console.log('Adding column "encrypted" to users table...');
    db.run("ALTER TABLE users ADD COLUMN encrypted INTEGER DEFAULT 0");
  }

  if (!hasUpdatedAt) {
    console.log('Adding column "updated_at" to users table...');
    db.run("ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT 0");
    // Atualizar registros existentes com timestamp atual
    db.run("UPDATE users SET updated_at = strftime('%s', 'now') WHERE updated_at = 0");
  }

  console.log('Schema update completed successfully!');
} catch (error) {
  console.error('Error updating schema:', error);
} finally {
  db.close();
}