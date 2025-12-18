import { Elysia, t } from 'elysia';
import { Database } from 'bun:sqlite';

const db = new Database('/app/database/studus.db');

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/', () => {
    const rows = db.query('SELECT * FROM settings').all() as { key: string, value: string }[];
    const settings: Record<string, string> = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    return settings;
  })
  .post('/', ({ body }) => {
    const { key, value } = body as { key: string, value: string };
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    return { success: true };
  }, {
    body: t.Object({
      key: t.String(),
      value: t.Any()
    })
  });
