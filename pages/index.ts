import { basicLayoutResponse, html, isRunningLocally } from '/lib/utils.ts';
import { getGoogleOauthUrl } from '/lib/providers/google.ts';
import { getGithubOauthUrl } from '/lib/providers/github.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

function get({ request, match, user, session }: RequestHandlerParams) {
  if (user) {
    return new Response('Redirect', { status: 302, headers: { 'Location': '/dashboard' } });
  }

  const urlSearchParams = new URL(request.url).searchParams;
  let extraState = {};

  if (urlSearchParams.has('redirectTo')) {
    extraState = { redirectTo: decodeURIComponent(urlSearchParams.get('redirectTo')!) };
  }

  const requestPermissions = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ];

  const googleOauthUrl = getGoogleOauthUrl({ requestPermissions, match, extraState });
  const githubOauthUrl = getGithubOauthUrl({ match, extraState });

  const htmlContent = html`
    <section class="page">
      <h1 class="text-4xl mb-6 text-center">
        Welcome to Deno Code Examples!
      </h1>
      <p class="text-center mt-2 mb-6">If you don't know what this is all about, it's a working <span class="font-bold">Deno app</span> with many things required in production apps nowadays, like user authentication (via Google and GitHub), filling forms, filling PDF forms, sending emails (with attachments), and uploading files to AWS S3. You can <a href="https://github.com/BrunoBernardino/deno-code-examples" class="hover:decoration-sky-700 hover:text-sky-700 underline">read more about it in GitHub</a>.</p>
      <p class="text-center mt-2 mb-6">You seem to be logged out at the moment, so click one of the buttons, have some fun.</p>
      <p class="text-center mt-2 mb-6">Don't worry about your data. Scopes are minimal and all data is deleted every day.<br />You can confirm in the code.</p>
      <section class="text-center flex justify-center grow-0 my-6">
        <a class="my-2 mx-2 button" href="${googleOauthUrl}">
          Login or Signup with Google
        </a>
        <a class="my-2 mx-2 button-secondary" href="${githubOauthUrl}">
          Login or Signup with GitHub
        </a>
      </section>
    </section>
  `;

  return basicLayoutResponse(htmlContent, {
    isRunningLocally: isRunningLocally(match),
    currentPath: match.pathname.input,
    user,
    session,
  });
}

const indexPage = page({
  get,
  accessMode: 'public',
});

export default indexPage;
