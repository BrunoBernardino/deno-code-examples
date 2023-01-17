import { basicLayoutResponse, html, isRunningLocally } from '/lib/utils.ts';
import { validateGoogleOauthAndCreateSession } from '/lib/providers/google.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

async function get({ request, match, user, session }: RequestHandlerParams) {
  if (user) {
    return new Response('Redirect', { status: 302, headers: { 'Location': '/dashboard' } });
  }

  try {
    return await validateGoogleOauthAndCreateSession(request, match);
  } catch (error) {
    const htmlContent = html`
      <section class="container notification-error min-h-screen">
        <h3>
          Error signing in!
        </h3>
        <p>
          ${error.toString()}
        </p>
        <p>
          <a class="font-bold hover:decoration-sky-700 hover:underline" href="/">
          &laquo; Go back home, try again
          </a>.
        </p>
      </section>
    `;

    return basicLayoutResponse(htmlContent, {
      isRunningLocally: isRunningLocally(match),
      currentPath: match.pathname.input,
      user,
      session,
    });
  }
}

const oauthGoogleCallbackPage = page({
  get,
  accessMode: 'public',
});

export default oauthGoogleCallbackPage;
