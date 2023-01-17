import { decode as base64Decode, encode as base64Encode } from 'std/encoding/base64url.ts';
import { Cookie, getCookies, setCookie } from 'std/http/cookie.ts';
import 'std/dotenv/load.ts';

import Database, { sql } from './interfaces/database.ts';
import { baseUrl, isRunningLocally } from './utils.ts';
import { getUserById } from './data-utils.ts';
import { User, UserSession } from './types.ts';

const JWT_SECRET = Deno.env.get('JWT_SECRET') || '';
export const COOKIE_NAME = 'deno-code-examples-v0';

const db = new Database();

export interface JwtData {
  data: {
    user_id: string;
    session_id: string;
  };
}

const textToData = (text: string) => new TextEncoder().encode(text);

export const dataToText = (data: Uint8Array) => new TextDecoder().decode(data);

const generateKey = async (key: string) =>
  await crypto.subtle.importKey('raw', textToData(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

async function signAuthJwt(key: CryptoKey, data: JwtData) {
  const payload = base64Encode(textToData(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))) + '.' +
    base64Encode(textToData(JSON.stringify(data) || ''));
  const signature = base64Encode(new Uint8Array(await crypto.subtle.sign({ name: 'HMAC' }, key, textToData(payload))));
  return `${payload}.${signature}`;
}

async function verifyAuthJwt(key: CryptoKey, jwt: string) {
  const jwtParts = jwt.split('.');
  if (jwtParts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const data = textToData(jwtParts[0] + '.' + jwtParts[1]);
  if (await crypto.subtle.verify({ name: 'HMAC' }, key, base64Decode(jwtParts[2]), data) === true) {
    return JSON.parse(dataToText(base64Decode(jwtParts[1]))) as JwtData;
  }

  throw new Error('Invalid JWT');
}

export async function getDataFromRequest(request: Request) {
  const cookies = getCookies(request.headers);

  if (!cookies[COOKIE_NAME]) {
    return null;
  }

  const result = await getDataFromCookie(cookies[COOKIE_NAME]);

  return result;
}

async function getDataFromCookie(cookieValue: string, skipSessionUpdate = false) {
  if (!cookieValue) {
    return null;
  }

  const key = await generateKey(JWT_SECRET);

  try {
    const token = await verifyAuthJwt(key, cookieValue) as JwtData;

    const user = await getUserById(token.data.user_id);

    if (!user) {
      throw new Error('User not found');
    }

    const session = (await db.query<UserSession>(
      sql`SELECT * FROM "user_sessions" WHERE "id" = $1 AND "user_id" = $2 LIMIT 1`,
      [token.data.session_id, token.data.user_id],
    ))[0];

    if (!session) {
      throw new Error('Session expired or not found');
    }

    const now = new Date();

    if (session.expires_at < now) {
      throw new Error('Session expired');
    }

    session.last_seen_at = now;

    // Update session
    if (!skipSessionUpdate) {
      await db.query(
        sql`UPDATE "user_sessions" SET "last_seen_at" = $1 WHERE "id" = $2 AND "user_id" = $3`,
        [session.last_seen_at, session.id, user.id],
      );
    }

    return { user, session, tokenData: token.data };
  } catch (error) {
    console.error(error);
  }

  return null;
}

export async function generateToken(tokenData: JwtData['data']) {
  const key = await generateKey(JWT_SECRET);

  const token = await signAuthJwt(key, { data: tokenData });

  return token;
}

export async function logoutUser(request: Request, match: URLPatternResult) {
  const tomorrow = new Date(new Date().setUTCDate(new Date().getUTCDate() + 1));

  const cookies = getCookies(request.headers);

  const result = await getDataFromCookie(cookies[COOKIE_NAME], true);

  if (!result || !result.tokenData?.session_id || !result.user) {
    throw new Error('Invalid session');
  }

  const { user, tokenData } = result;
  const { session_id } = tokenData;

  // Delete user session
  await db.query(sql`DELETE FROM "user_sessions" WHERE "id" = $1 AND "user_id" = $2`, [
    session_id,
    user.id,
  ]);

  // Generate response with empty and expiring cookie
  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: '',
    expires: tomorrow,
    domain: isRunningLocally(match) ? 'localhost' : baseUrl.replace('https://', ''),
    path: '/',
    secure: isRunningLocally(match) ? false : true,
    httpOnly: true,
    sameSite: 'Lax',
  };

  const response = new Response('Logged Out', {
    status: 302,
    headers: { 'Location': '/', 'Content-Type': 'text/html; charset=utf-8' },
  });

  setCookie(response.headers, cookie);

  return response;
}

export async function createSession(
  _request: Request,
  match: URLPatternResult,
  user: User,
  { urlToRedirectTo = '/dashboard', sessionExpiresAt }: {
    urlToRedirectTo?: string;
    sessionExpiresAt?: Date;
  } = {},
) {
  // Add new user session to the db
  const oneMonthFromToday = new Date(new Date().setUTCMonth(new Date().getUTCMonth() + 1));

  const newSession: Omit<UserSession, 'id' | 'created_at'> = {
    user_id: user.id,
    expires_at: sessionExpiresAt || oneMonthFromToday,
    last_seen_at: new Date(),
  };

  const newUserSessionResultId = (await db.query<{ id: string }>(
    sql`INSERT INTO "user_sessions" (
      "user_id",
      "expires_at",
      "last_seen_at"
    ) VALUES ($1, $2, $3)
      RETURNING "id"`,
    [
      newSession.user_id,
      newSession.expires_at,
      newSession.last_seen_at,
    ],
  ))[0];

  const newSessionId = newUserSessionResultId.id;

  // Generate response with session cookie
  const token = await generateToken({ user_id: user.id, session_id: newSessionId });

  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: token,
    expires: oneMonthFromToday,
    domain: isRunningLocally(match) ? 'localhost' : baseUrl.replace('https://', ''),
    path: '/',
    secure: isRunningLocally(match) ? false : true,
    httpOnly: true,
    sameSite: 'Lax',
  };

  const response = new Response('Logged In', {
    status: 302,
    headers: { 'Location': urlToRedirectTo, 'Content-Type': 'text/html; charset=utf-8' },
  });

  setCookie(response.headers, cookie);

  return response;
}

export async function updateSessionCookie(
  response: Response,
  match: URLPatternResult,
  userSession: UserSession,
  newSessionData: JwtData['data'],
) {
  const token = await generateToken(newSessionData);

  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: token,
    expires: userSession.expires_at,
    domain: isRunningLocally(match) ? 'localhost' : baseUrl.replace('https://', ''),
    path: '/',
    secure: isRunningLocally(match) ? false : true,
    httpOnly: true,
    sameSite: 'Lax',
  };

  setCookie(response.headers, cookie);

  return response;
}
