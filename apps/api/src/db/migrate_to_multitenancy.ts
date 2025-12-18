/**
 * Migration script to add userId to existing tables for multi-tenancy support
 */
import { Database } from 'bun:sqlite';

const db = new Database('../../database/studus.db');

async function migrate() {
  console.log('Starting migration to multi-tenancy...');

  try {
    // Get the admin user ID (assuming it's ID 1)
    const adminUser = db.query('SELECT id FROM users WHERE username = "admin" LIMIT 1').get() as any;

    if (!adminUser) {
      console.error('Admin user not found! Please create an admin user first.');
      process.exit(1);
    }

    const adminUserId = adminUser.id;
    console.log(`Found admin user with ID: ${adminUserId}`);

    // Add userId columns if they don't exist
    console.log('Adding userId columns...');

    // Update disciplines
    try {
      db.run(`ALTER TABLE disciplines ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to disciplines');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to disciplines:', e);
      }
    }

    // Update existing disciplines to belong to admin user
    const disciplinesResult = db.run('UPDATE disciplines SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${disciplinesResult.changes} discipline records`);

    // Update students
    try {
      db.run(`ALTER TABLE students ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to students');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to students:', e);
      }
    }

    const studentsResult = db.run('UPDATE students SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${studentsResult.changes} student records`);

    // Update grades
    try {
      db.run(`ALTER TABLE grades ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to grades');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to grades:', e);
      }
    }

    const gradesResult = db.run('UPDATE grades SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${gradesResult.changes} grade records`);

    // Update lessons
    try {
      db.run(`ALTER TABLE lessons ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to lessons');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to lessons:', e);
      }
    }

    const lessonsResult = db.run('UPDATE lessons SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${lessonsResult.changes} lesson records`);

    // Update attendances
    try {
      db.run(`ALTER TABLE attendances ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to attendances');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to attendances:', e);
      }
    }

    const attendancesResult = db.run('UPDATE attendances SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${attendancesResult.changes} attendance records`);

    // Update tasks
    try {
      db.run(`ALTER TABLE tasks ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
      console.log('✅ Added userId to tasks');
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Error adding userId to tasks:', e);
      }
    }

    const tasksResult = db.run('UPDATE tasks SET userId = ? WHERE userId IS NULL', [adminUserId]);
    console.log(`✅ Updated ${tasksResult.changes} task records`);

    // Update taskLogs (if table exists)
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_logs'").all() as any[];
    if (tableInfo.length > 0) {
      try {
        db.run(`ALTER TABLE task_logs ADD COLUMN userId INTEGER NOT NULL DEFAULT ${adminUserId}`);
        console.log('✅ Added userId to taskLogs');
      } catch (e: any) {
        if (!e.message.includes('duplicate column name')) {
          console.error('Error adding userId to taskLogs:', e);
        }
      }

      const taskLogsResult = db.run('UPDATE taskLogs SET userId = ? WHERE userId IS NULL', [adminUserId]);
      console.log(`✅ Updated ${taskLogsResult.changes} taskLog records`);
    } else {
      console.log('ℹ️ taskLogs table does not exist, skipping');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('All existing data has been assigned to the admin user.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();