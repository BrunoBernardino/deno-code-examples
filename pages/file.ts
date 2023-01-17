import { getSignedFileUrl } from '/lib/providers/aws.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

async function get({ match, user }: RequestHandlerParams) {
  if (!match.pathname.groups.filePath) {
    return new Response('Redirect', { status: 302, headers: { 'Location': '/dashboard' } });
  }

  const { filePath } = match.pathname.groups;

  const pathParts = filePath.split('/');

  for (const pathPart of pathParts) {
    if (pathPart.startsWith('user-')) {
      const fileUserId = pathPart.replace('user-', '');

      if (user!.id !== fileUserId) {
        return new Response('Redirect', { status: 302, headers: { 'Location': '/dashboard' } });
      }
    }
  }

  const signedFileUrl = getSignedFileUrl(filePath);

  const fileResponse = await fetch(signedFileUrl);

  return fileResponse;
}

const filePage = page({
  get,
  accessMode: 'user',
});

export default filePage;
