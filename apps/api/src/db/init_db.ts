import { Database } from 'bun:sqlite';

const db = new Database('/app/database/studus.db');

console.log('Inicializando Banco de Dados...');

// Users
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT,
  studus_username TEXT,
  studus_password TEXT,
  cookies TEXT,
  created_at INTEGER DEFAULT (cast(strftime('%s','now') as int))
);`);

// Tasks (Update schema to include performance cols)
db.run(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  payload TEXT,
  result TEXT,
  progress INTEGER DEFAULT 0,
  performance TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (cast(strftime('%s','now') as int)),
  updated_at INTEGER DEFAULT (cast(strftime('%s','now') as int))
);`);

// Disciplines
db.run(`CREATE TABLE IF NOT EXISTS disciplines (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  class TEXT,
  schedule TEXT,
  last_sync_at INTEGER
);`);

// Students
db.run(`CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);`);

// Grades
db.run(`CREATE TABLE IF NOT EXISTS grades (
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
);`);

// Lessons
db.run(`CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  discipline_id TEXT,
  date TEXT,
  content TEXT,
  topic TEXT,
  FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
);`);

// Attendances
db.run(`CREATE TABLE IF NOT EXISTS attendances (
  id INTEGER PRIMARY KEY,
  lesson_id TEXT,
  student_id TEXT,
  present BOOLEAN,
  updated_at INTEGER DEFAULT (cast(strftime('%s','now') as int)),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);`);

// Settings
db.run(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);`);
db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_sync_enabled', 'false')");
db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_sync_interval', '24')");

console.log('Banco de dados pronto!');
process.exit(0);
