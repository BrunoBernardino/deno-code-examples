import { decode as base64Decode } from 'std/encoding/base64url.ts';
import 'std/dotenv/load.ts';

import { baseUrl, isRunningLocally, PORT } from '/lib/utils.ts';
import { createNewUser, getUserByEmail } from '/lib/data-utils.ts';
import { createSession, dataToText } from '/lib/auth.ts';

const GOOGLE_OAUTH_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_OAUTH_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';

interface GoogleOauthExtraState {
  redirectTo?: string;
}

interface OAuthUrlOptions {
  requestPermissions: string[];
  match: URLPatternResult;
  redirectUrlPath?: string;
  requestingForOfflineUse?: boolean;
  extraState?: GoogleOauthExtraState;
}

export function getGoogleOauthUrl(
  {
    requestPermissions,
    match,
    redirectUrlPath = '/oauth/google/callback',
    requestingForOfflineUse = false,
    extraState = {},
  }: OAuthUrlOptions,
) {
  const state = {
    ...extraState,
    random: Math.random(),
  };

  const redirectUrl = `${isRunningLocally(match) ? `http://localhost:${PORT}` : baseUrl}${redirectUrlPath}`;

  // NOTE: More info on the parameters at https://developers.google.com/identity/protocols/oauth2/native-app
  const params = {
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: 'code',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    access_type: requestingForOfflineUse ? 'offline' : 'online',
    state: btoa(JSON.stringify(state)),
    scope: requestPermissions.join(' '),
  };

  const searchParams = new URLSearchParams(params);

  const googleOauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;

  return googleOauthUrl;
}

interface GoogleJwtIdToken {
  email?: string;
  name?: string;
  picture?: string;
  locale?: string;
  sub?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
}

interface GoogleOAuthResponse {
  access_token: string;
  refresh_token?: string; // We only get it on the first "offline" authorization
  expires_in: number;
  token_type: 'Bearer';
  scope: string;
  id_token: string;
}

function decodeGoogleJwt(jwt: string) {
  const jwtParts = jwt.split('.');
  if (jwtParts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  return JSON.parse(dataToText(base64Decode(jwtParts[1]))) as GoogleJwtIdToken;
}

function parseGoogleOauthState(state: string) {
  let stateParams: GoogleOauthExtraState = {};

  try {
    stateParams = JSON.parse(atob(state));
  } catch (error) {
    console.log(`Failed to parse Google OAuth state: ${error}`);
    console.error(error);
  }

  return stateParams;
}

export async function validateGoogleOauthAndCreateSession(request: Request, match: URLPatternResult) {
  const urlSearchParams = new URL(request.url).searchParams;
  const code = urlSearchParams.get('code');

  if (!code) {
    throw new Error('Missing OAuth "code" parameter');
  }

  const redirectUrl = `${isRunningLocally(match) ? `http://localhost:${PORT}` : baseUrl}/oauth/google/callback`;

  const params = {
    code,
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUrl,
    grant_type: 'authorization_code',
  };

  const searchParams = new URLSearchParams(params);

  // Get info from Google
  const googleOauthResponse = await fetch(`https://oauth2.googleapis.com/token?${searchParams.toString()}`, {
    method: 'POST',
  });
  const { id_token } = (await googleOauthResponse.json()) as GoogleOAuthResponse;

  if (!id_token) {
    throw new Error('Invalid Google OAuth Response');
  }

  const { email, name, given_name, family_name } = decodeGoogleJwt(id_token);

  if (!email) {
    throw new Error('Missing user/email');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Confirm the user exists (or signup)
  let user = await getUserByEmail(normalizedEmail);

  if (!user) {
    user = await createNewUser(normalizedEmail, name || `${given_name} ${family_name}`);
  }

  let urlToRedirectTo = '/dashboard';

  if (urlSearchParams.has('state')) {
    const state = parseGoogleOauthState(urlSearchParams.get('state')!);

    if (state.redirectTo) {
      urlToRedirectTo = state.redirectTo;
    }
  }

  return createSession(request, match, user, { urlToRedirectTo });
}
