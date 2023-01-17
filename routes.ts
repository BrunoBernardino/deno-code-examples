import { serveFile } from 'std/http/file_server.ts';

import { baseUrl, html, serveFileWithSass, serveFileWithTs } from '/lib/utils.ts';
import { getDataFromRequest } from '/lib/auth.ts';
import { Page } from '/lib/page.ts';

// NOTE: This won't be necessary once https://github.com/denoland/deploy_feedback/issues/1 is closed
import indexPage from '/pages/index.ts';
import dashboardPage from '/pages/dashboard.ts';
import logoutPage from '/pages/logout.ts';
import oauthGoogleCallbackPage from '/pages/oauth/google/callback.ts';
import oauthGithubCallbackPage from '/pages/oauth/github/callback.ts';
import fillAFormPage from '/pages/fill-a-form.ts';
import filePage from '/pages/file.ts';

const pages = {
  index: indexPage,
  dashboard: dashboardPage,
  logout: logoutPage,
  oauthGoogleCallback: oauthGoogleCallbackPage,
  oauthGithubCallback: oauthGithubCallbackPage,
  fillAForm: fillAFormPage,
  file: filePage,
};

export interface Route {
  pattern: URLPattern;
  handler: (
    request: Request,
    match: URLPatternResult,
  ) => Response | Promise<Response>;
}

interface Routes {
  [routeKey: string]: Route;
}

function createPageRouteHandler(id: string, pathname: string) {
  return {
    pattern: new URLPattern({ pathname }),
    handler: async (request: Request, match: URLPatternResult) => {
      try {
        // NOTE: Use this instead once https://github.com/denoland/deploy_feedback/issues/1 is closed
        // const page = await import(`/pages/${id}.ts`);

        // @ts-ignore necessary because of the comment above
        const page = pages[id];

        const { get, post, patch, delete: deleteAction } = page as Page;

        const { user, session, tokenData } = (await getDataFromRequest(request)) || {};

        switch (request.method) {
          case 'GET':
            if (get) {
              return await get({ request, match, user, session: { userSession: session, tokenData } });
            }
            break;
          case 'POST':
            if (post) {
              return await post({ request, match, user, session: { userSession: session, tokenData } });
            }
            break;
          case 'PATCH':
            if (patch) {
              return await patch({ request, match, user, session: { userSession: session, tokenData } });
            }
            break;
          case 'DELETE':
            if (deleteAction) {
              return await deleteAction({ request, match, user, session: { userSession: session, tokenData } });
            }
            break;
          default:
            return new Response('Not Implemented', { status: 501 });
        }

        return new Response('Not Implemented', { status: 501 });
      } catch (error) {
        if (error.toString().includes('NotFound')) {
          return new Response('Not Found', { status: 404 });
        }

        console.error(error);

        return new Response('Internal Server Error', { status: 500 });
      }
    },
  };
}

const routes: Routes = {
  sitemap: {
    pattern: new URLPattern({ pathname: '/sitemap.xml' }),
    handler: (_request) => {
      const pages = [
        '/',
      ];

      // Keep published date on the current hour
      const lastPublishedDate = new Date();
      lastPublishedDate.setMinutes(0);
      lastPublishedDate.setSeconds(0);
      lastPublishedDate.setMilliseconds(0);

      const sitemapContent = html`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${
        pages.map((page) =>
          html`
    <url>
      <loc>${baseUrl}${page}</loc>
      <lastmod>${lastPublishedDate.toISOString()}</lastmod>
      <priority>${page === '/' ? '1.0' : '0.8'}</priority>
    </url>
  `
        ).join('')
      }
</urlset>
`;

      const oneDayInSeconds = 24 * 60 * 60;

      return new Response(sitemapContent, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': `max-age=${oneDayInSeconds}, public`,
        },
      });
    },
  },
  favicon: {
    pattern: new URLPattern({ pathname: '/favicon.ico' }),
    handler: (request) => {
      return serveFile(request, 'public/images/favicon.ico');
    },
  },
  robots: {
    pattern: new URLPattern({ pathname: '/robots.txt' }),
    handler: (request) => {
      return serveFile(request, 'public/robots.txt');
    },
  },
  public: {
    pattern: new URLPattern({ pathname: '/public/:filePath*' }),
    handler: (request, match) => {
      const { filePath } = match.pathname.groups;

      try {
        const fullFilePath = `public/${filePath}`;

        const fileExtension = filePath.split('.').pop()?.toLowerCase();

        if (fileExtension === 'ts') {
          return serveFileWithTs(request, fullFilePath);
        } else if (fileExtension === 'scss') {
          return serveFileWithSass(request, fullFilePath);
        } else {
          return serveFile(request, fullFilePath);
        }
      } catch (error) {
        if (error.toString().includes('NotFound')) {
          return new Response('Not Found', { status: 404 });
        }

        console.error(error);

        return new Response('Internal Server Error', { status: 500 });
      }
    },
  },
  index: createPageRouteHandler('index', '/'),
  dashboard: createPageRouteHandler('dashboard', '/dashboard'),
  logout: createPageRouteHandler('logout', '/logout'),
  oauthGoogleCallback: createPageRouteHandler('oauthGoogleCallback', '/oauth/google/callback'),
  oauthGithubCallback: createPageRouteHandler('oauthGithubCallback', '/oauth/github/callback'),
  fillAForm: createPageRouteHandler('fillAForm', '/fill-a-form'),
  file: createPageRouteHandler('file', '/file/:filePath*'),
};

export default routes;
