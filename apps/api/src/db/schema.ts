import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // Hashed local password (bcrypt)
  studusUsername: text('studus_username'),
  studusPassword: text('studus_password'), // AES encrypted
  encrypted: integer('encrypted', { mode: 'boolean' }).default(false), // Track if password is encrypted
  cookies: text('cookies', { mode: 'json' }), // Active session cookies
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const disciplines = sqliteTable('disciplines', {
  id: text('id').primaryKey(), // Studus Code/ID
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  code: text('code'),
  name: text('name').notNull(),
  class: text('class'), // Turma
  schedule: text('schedule'), // Horario
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(), // Matrícula
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  name: text('name').notNull(),
});

export const grades = sqliteTable('grades', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  studentId: text('student_id').references(() => students.id),
  disciplineId: text('discipline_id').references(() => disciplines.id),
  n1: text('n1'), // Using text to handle "3,5" format easier, or convert later
  n2: text('n2'),
  n3: text('n3'),
  faults: text('faults'),
  average: text('average'),
  situation: text('situation'), // APROVADO, REPROVADO, ETC
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(), // Studus ID or generated
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  disciplineId: text('discipline_id').references(() => disciplines.id),
  date: text('date'),
  content: text('content'),
  topic: text('topic'),
});

export const attendances = sqliteTable('attendances', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  lessonId: text('lesson_id').references(() => lessons.id),
  studentId: text('student_id').references(() => students.id),
  present: integer('present', { mode: 'boolean' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  type: text('type').notNull(),
  status: text('status').default('PENDING'),
  payload: text('payload', { mode: 'json' }),
  result: text('result', { mode: 'json' }),
  progress: integer('progress').default(0),
  performance: text('performance', { mode: 'json' }), // JSON: { login: 2s, scrape: 10s, total: 12s }
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const taskLogs = sqliteTable('task_logs', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id), // Multi-tenancy
  taskId: integer('task_id').references(() => tasks.id),
  level: text('level'), // 'INFO', 'WARN', 'ERROR'
  message: text('message'),
  screenshotPath: text('screenshot_path'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});
