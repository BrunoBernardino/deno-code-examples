import { logoutUser } from '/lib/auth.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

async function get({ request, match }: RequestHandlerParams) {
  try {
    const response = await logoutUser(request, match);
    return response;
  } catch (_error) {
    // Do nothing
  }

  return new Response('Redirect', { status: 302, headers: { 'Location': '/' } });
}

const logoutPage = page({
  get,
  accessMode: 'user',
});

export default logoutPage;
