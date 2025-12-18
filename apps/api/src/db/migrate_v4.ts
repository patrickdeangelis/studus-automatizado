import { Database } from 'bun:sqlite';

const dbPath = '/app/database/studus.db';
const db = new Database(dbPath);

console.log('Aplicando migração de aulas...');

db.run(`
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    discipline_id TEXT,
    date TEXT,
    content TEXT,
    topic TEXT,
    FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS attendances (
    id INTEGER PRIMARY KEY,
    lesson_id TEXT,
    student_id TEXT,
    present BOOLEAN,
    updated_at INTEGER DEFAULT (cast(strftime('%s','now') as int)),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id),
    FOREIGN KEY (student_id) REFERENCES students(id)
  );
`);

console.log('Migração de aulas concluída.');
process.exit(0);
