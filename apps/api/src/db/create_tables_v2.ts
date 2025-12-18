import { Database } from 'bun:sqlite';
import path from 'path';

const dbPath = '/app/database/studus.db';
const db = new Database(dbPath);

console.log('Criando tabelas students e grades...');

db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY,
    student_id TEXT,
    discipline_id TEXT,
    n1 TEXT,
    n2 TEXT,
    n3 TEXT,
    faults TEXT,
    average TEXT,
    situation TEXT,
    updated_at INTEGER DEFAULT (cast(strftime('%s','now') as int)),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
  );
`);

console.log('Tabelas criadas com sucesso!');
process.exit(0);
