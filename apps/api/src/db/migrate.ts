import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { db } from './index';

try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations complete!');
} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}
