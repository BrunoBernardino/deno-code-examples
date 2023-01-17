import Database, { sql } from '/lib/interfaces/database.ts';
import Lock from '/lib/interfaces/lock.ts';

const db = new Database();

const LOCK_NAME = 'crons-cleanup';

async function cleanupSessionsAndUsers() {
  const lock = new Lock();

  if (await lock.has(LOCK_NAME)) {
    lock.close();
    console.log('Cron Job locked');
    return;
  }

  const yesterday = new Date(new Date().setUTCDate(new Date().getUTCDate() - 1));

  try {
    const result = await db.query<{ count: number }>(
      sql`WITH "deleted" AS (
        DELETE FROM "user_sessions" WHERE "created_at" <= $1 RETURNING *
      )
        SELECT COUNT(*) FROM "deleted"`,
      [
        yesterday.toISOString().substring(0, 10),
      ],
    );

    console.log('Deleted', result[0].count, 'user sessions');
  } catch (error) {
    console.log(error);
  }

  try {
    const result = await db.query<{ count: number }>(
      sql`WITH "deleted" AS (
        DELETE FROM "users" WHERE "created_at" <= $1 RETURNING *
      )
        SELECT COUNT(*) FROM "deleted"`,
      [
        yesterday.toISOString().substring(0, 10),
      ],
    );

    console.log('Deleted', result[0].count, 'users');
  } catch (error) {
    console.log(error);
  }

  await lock.clear(LOCK_NAME);

  lock.close();
}

await cleanupSessionsAndUsers();
