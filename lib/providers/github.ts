import 'std/dotenv/load.ts';

import { baseUrl, isRunningLocally, PORT } from '/lib/utils.ts';
import { createNewUser, getUserByEmail } from '/lib/data-utils.ts';
import { createSession } from '/lib/auth.ts';

const GITHUB_OAUTH_CLIENT_ID = Deno.env.get('GITHUB_OAUTH_CLIENT_ID') || '';
const GITHUB_OAUTH_CLIENT_SECRET = Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET') || '';
const GITHUB_API_VERSION = '2022-11-28';

interface GithubOauthExtraState {
  redirectTo?: string;
}

interface OAuthUrlOptions {
  match: URLPatternResult;
  redirectUrlPath?: string;
  extraState?: GithubOauthExtraState;
}

interface GithubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: 'User';
  name: string;
  company: string;
  location: string;
  email: string;
}

export function getGithubOauthUrl(
  {
    match,
    redirectUrlPath = '/oauth/github/callback',
    extraState = {},
  }: OAuthUrlOptions,
) {
  const state = {
    ...extraState,
    random: Math.random(),
  };

  const redirectUrl = `${isRunningLocally(match) ? `http://localhost:${PORT}` : baseUrl}${redirectUrlPath}`;

  // NOTE: More info on the parameters at https://docs.github.com/en/developers/apps/building-github-apps/identifying-and-authorizing-users-for-github-apps#web-application-flow
  const params = {
    client_id: GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: redirectUrl,
    state: btoa(JSON.stringify(state)),
  };

  const searchParams = new URLSearchParams(params);

  const githubOauthUrl = `https://github.com/login/oauth/authorize?${searchParams.toString()}`;

  return githubOauthUrl;
}

interface GithubOAuthResponse {
  access_token: string;
  refresh_token: string;
  refresh_token_expires_in: number;
  expires_in: number;
  token_type: 'bearer';
  scope: string;
}

function parseGithubOauthState(state: string) {
  let stateParams: GithubOauthExtraState = {};

  try {
    stateParams = JSON.parse(atob(state));
  } catch (error) {
    console.log(`Failed to parse GitHub OAuth state: ${error}`);
    console.error(error);
  }

  return stateParams;
}

export async function validateGithubOauthAndCreateSession(request: Request, match: URLPatternResult) {
  const urlSearchParams = new URL(request.url).searchParams;
  const code = urlSearchParams.get('code');

  if (!code) {
    throw new Error('Missing OAuth "code" parameter');
  }

  const redirectUrl = `${isRunningLocally(match) ? `http://localhost:${PORT}` : baseUrl}/oauth/github/callback`;

  const params = {
    code,
    client_id: GITHUB_OAUTH_CLIENT_ID,
    client_secret: GITHUB_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUrl,
  };

  const searchParams = new URLSearchParams(params);

  // Get info from Github
  const githubOauthResponse = await fetch(`https://github.com/login/oauth/access_token?${searchParams.toString()}`, {
    headers: {
      'Accept': 'application/json; charset=utf-8',
    },
    method: 'POST',
  });
  const { access_token } = (await githubOauthResponse.json()) as GithubOAuthResponse;

  if (!access_token) {
    throw new Error('Invalid GitHub OAuth Response');
  }

  const { email, name, login } = await getUser(access_token);

  if (!email) {
    throw new Error('Missing user/email');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Confirm the user exists (or signup)
  let user = await getUserByEmail(normalizedEmail);

  if (!user) {
    user = await createNewUser(normalizedEmail, name || login);
  }

  let urlToRedirectTo = '/dashboard';

  if (urlSearchParams.has('state')) {
    const state = parseGithubOauthState(urlSearchParams.get('state')!);

    if (state.redirectTo) {
      urlToRedirectTo = state.redirectTo;
    }
  }

  return createSession(request, match, user, { urlToRedirectTo });
}

async function getUser(accessToken: string) {
  const user = await makeApiRequest('/user', { accessToken }) as GithubUser;

  return user;
}

async function makeApiRequest(
  endpoint: string,
  { accessToken, method = 'GET', searchParams = new URLSearchParams(), body, apiVersion = GITHUB_API_VERSION }: {
    accessToken: string;
    method?: Request['method'];
    searchParams?: URLSearchParams;
    body?: BodyInit;
    apiVersion?: string;
  },
) {
  const apiResponse = await fetch(`https://api.github.com${endpoint}?${searchParams.toString()}`, {
    method,
    body,
    headers: {
      'Accept': 'application/vnd.github+json; charset=utf-8',
      'Authorization': `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': apiVersion,
    },
  });

  return apiResponse.json();
}
