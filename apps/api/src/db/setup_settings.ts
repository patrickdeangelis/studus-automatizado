import { Database } from 'bun:sqlite';

const dbPath = '/app/database/studus.db';
const db = new Database(dbPath);

console.log('Criando tabela de configurações...');

db.run(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Inserir valores padrão se não existirem
db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_sync_enabled', 'false')");
db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_sync_interval', '24')"); // horas

console.log('Configurações inicializadas.');
process.exit(0);
