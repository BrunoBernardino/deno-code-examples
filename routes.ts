import { serveFile } from 'std/http/file_server.ts';
import { parse } from 'std/datetime/mod.ts';
import { render } from 'https://deno.land/x/gfm@0.4.0/mod.ts';

import {
  baseUrl,
  buildRFC822Date,
  defaultDescription,
  defaultTitle,
  getAllBlogArticles,
  html,
  serveFileWithSass,
  serveFileWithTs,
} from '/lib/utils.ts';
import { getDataFromRequest } from '/lib/auth.ts';
import { Page } from '/lib/page.ts';

// NOTE: This won't be necessary once https://github.com/denoland/deploy_feedback/issues/433 is closed
import indexPage from '/pages/index.ts';
import dashboardPage from '/pages/dashboard.ts';
import logoutPage from '/pages/logout.ts';
import oauthGoogleCallbackPage from '/pages/oauth/google/callback.ts';
import oauthGithubCallbackPage from '/pages/oauth/github/callback.ts';
import fillAFormPage from '/pages/fill-a-form.ts';
import filePage from '/pages/file.ts';
import blogPage from '/pages/blog/index.ts';
import blogArticlePage from '/pages/blog/article.ts';

const pages = {
  index: indexPage,
  dashboard: dashboardPage,
  logout: logoutPage,
  oauthGoogleCallback: oauthGoogleCallbackPage,
  oauthGithubCallback: oauthGithubCallbackPage,
  fillAForm: fillAFormPage,
  file: filePage,
  blog: blogPage,
  blogArticle: blogArticlePage,
};

const articles = await getAllBlogArticles();

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

function createPageRouteHandler(id: keyof typeof pages, pathname: string) {
  return {
    pattern: new URLPattern({ pathname }),
    handler: async (request: Request, match: URLPatternResult) => {
      try {
        // NOTE: Use this instead once https://github.com/denoland/deploy_feedback/issues/433 is closed
        // const page = await import(`/pages/${id}.ts`);

        const page: Page = pages[id];

        const { get, post, patch, delete: deleteAction } = page;

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

const oneDayInSeconds = 24 * 60 * 60;

const routes: Routes = {
  sitemap: {
    pattern: new URLPattern({ pathname: '/sitemap.xml' }),
    handler: () => {
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
  ${
        articles.map((article) => `
    <url>
      <loc>${baseUrl}/blog/${article.slug}</loc>
      <lastmod>${parse(article.date, 'yyyy-MM-dd').toISOString()}</lastmod>
      <priority>0.9</priority>
    </url>
  `).join('')
      }
</urlset>
`;

      return new Response(sitemapContent, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': `max-age=${oneDayInSeconds}, public`,
        },
      });
    },
  },
  rss: {
    pattern: new URLPattern({ pathname: '/rss.xml' }),
    handler: (_request) => {
      const feedContent = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>${defaultTitle}</title>
		<link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
		<description>${defaultDescription}</description>
		<lastBuildDate>${buildRFC822Date(articles[0].date)}</lastBuildDate>
		<docs>http://blogs.law.harvard.edu/tech/rss</docs>
		<generator>${baseUrl}</generator>
		<copyright>I don't care what you do with this. Take it.</copyright>
  ${
        articles.map((article) => `
    <item>
			<title>
				<![CDATA[${article.title}]]>
			</title>
			<link>${baseUrl}/blog/${article.slug}</link>
			<guid>${baseUrl}/blog/${article.slug}</guid>
			<pubDate>${buildRFC822Date(article.date)}</pubDate>
			<description>
				<![CDATA[${render(article.description)}]]>
			</description>
		</item>
  `).join('')
      }
</channel>
</rss>
`;

      return new Response(feedContent, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': `max-age=${oneDayInSeconds}, public`,
        },
      });
    },
  },
  atom: {
    pattern: new URLPattern({ pathname: '/atom.xml' }),
    handler: (_request) => {
      const feedContent = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:atom="http://www.w3.org/2005/Atom">
	<id>${baseUrl}/</id>
	<title>${defaultTitle}</title>
	<updated>${parse(articles[0].date, 'yyyy-MM-dd').toISOString()}</updated>
	<generator>${baseUrl}</generator>
  <atom:link href="${baseUrl}/atom.xml" rel="self" type="application/atom+xml" />
	<author>
		<name>Bruno Bernardino</name>
		<uri>${baseUrl}</uri>
	</author>
	<link rel="alternate" href="${baseUrl}"/>
	<subtitle>${defaultDescription}</subtitle>
	<rights>I don't care what you do with this. Take it.</rights>
  ${
        articles.map((article) => `
    <entry>
			<title type="html">
				<![CDATA[${article.title}]]>
			</title>
      <id>${baseUrl}/blog/${article.slug}</id>
			<link href="${baseUrl}/blog/${article.slug}" />
			<updated>${parse(article.date, 'yyyy-MM-dd').toISOString()}</updated>
			<content type="html">
				<![CDATA[${render(article.description)}]]>
			</content>
		</entry>
  `).join('')
      }
</feed>
`;

      return new Response(feedContent, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': `max-age=${oneDayInSeconds}, public`,
        },
      });
    },
  },
  feed: {
    pattern: new URLPattern({ pathname: '/feed.json' }),
    handler: (_request) => {
      const feed = {
        version: 'https://jsonfeed.org/version/1.1',
        title: defaultTitle,
        home_page_url: baseUrl,
        description: defaultDescription,
        authors: [{
          name: 'Bruno Bernardino',
          url: baseUrl,
        }],
        language: 'en',
        items: articles.map((article) => ({
          id: `${baseUrl}/blog/${article.slug}`,
          url: `${baseUrl}/blog/${article.slug}`,
          title: article.title,
          content_text: article.description,
          content_html: render(article.description),
          summary: article.subtitle,
          date_modified: parse(article.date, 'yyyy-MM-dd').toISOString(),
          date_published: parse(article.date, 'yyyy-MM-dd').toISOString(),
        })),
      };

      return new Response(JSON.stringify(feed, null, 2), {
        headers: {
          'content-type': 'application/feed+json; charset=utf-8',
          'cache-control': `max-age=${oneDayInSeconds}, public`,
        },
      });
    },
  },
  robots: {
    pattern: new URLPattern({ pathname: '/robots.txt' }),
    handler: async (request) => {
      const response = await serveFile(request, `public/robots.txt`);
      response.headers.set('cache-control', `max-age=${oneDayInSeconds}, public`);
      return response;
    },
  },
  favicon: {
    pattern: new URLPattern({ pathname: '/favicon.ico' }),
    handler: async (request) => {
      const response = await serveFile(request, `public/images/favicon.ico`);
      response.headers.set('cache-control', `max-age=${oneDayInSeconds}, public`);
      return response;
    },
  },
  public: {
    pattern: new URLPattern({ pathname: '/public/:filePath*' }),
    handler: async (request, match) => {
      const { filePath } = match.pathname.groups;

      try {
        const fullFilePath = `public/${filePath}`;

        const fileExtension = filePath!.split('.').pop()?.toLowerCase();

        let response: Response;

        if (fileExtension === 'ts') {
          response = await serveFileWithTs(request, fullFilePath);
        } else if (fileExtension === 'scss') {
          response = await serveFileWithSass(request, fullFilePath);
        } else {
          response = await serveFile(request, `public/${filePath}`);
        }

        response.headers.set('cache-control', `max-age=${oneDayInSeconds}, public`);
        return response;
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
  blog: createPageRouteHandler('blog', '/blog'),
  blogArticle: createPageRouteHandler('blogArticle', '/blog/:slug'),
};

export default routes;
