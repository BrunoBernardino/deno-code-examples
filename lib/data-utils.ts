import Database, { sql } from './interfaces/database.ts';
import SimpleCache from './interfaces/simple-cache.ts';
import { FilledForm, User } from './types.ts';

const db = new Database();

export async function getUserByEmail(email: string) {
  const lowercaseEmail = email.toLowerCase().trim();

  const user = (await db.query<User>(sql`SELECT * FROM "users" WHERE "email" = $1 LIMIT 1`, [
    lowercaseEmail,
  ]))[0];

  return user;
}

export async function getUserById(id: string) {
  const user = (await db.query<User>(sql`SELECT * FROM "users" WHERE "id" = $1 LIMIT 1`, [
    id,
  ]))[0];

  return user;
}

export async function createNewUser(email: string, name: string) {
  const newUser = (await db.query<User>(
    sql`INSERT INTO "users" (
      "email",
      "name"
    ) VALUES ($1, $2)
    RETURNING *`,
    [
      email,
      name,
    ],
  ))[0];

  return newUser;
}

export async function getFilledFormsForUser(userId: string) {
  const filledFormsCache = new SimpleCache(`filled-forms:${userId}`);

  try {
    const cachedFormsJson = (await filledFormsCache.get());

    return JSON.parse(cachedFormsJson) as FilledForm[];
  } catch (_error) {
    // Do nothing
  }

  return [] as FilledForm[];
}

export async function cacheNewFilledForm(id: string, userId: string, url: string) {
  const newFilledForm: FilledForm = {
    id,
    date: new Date().toISOString().substring(0, 10),
    url,
  };

  const filledFormsCache = new SimpleCache(
    `filled-forms:${userId}`,
  );

  const filledForms = await getFilledFormsForUser(userId);

  filledForms.push(newFilledForm);

  await filledFormsCache.set(JSON.stringify(filledForms));

  return newFilledForm.id;
}
