import 'std/dotenv/load.ts';
import { transpile } from 'https://deno.land/x/emit@0.33.0/mod.ts';
import sass from 'https://deno.land/x/denosass@1.0.6/mod.ts';
import { serveFile } from 'std/http/file_server.ts';
import { extract } from 'std/front_matter/any.ts';

import menu from './components/menu.ts';
import loading from './components/loading.ts';
import { RequestHandlerParams } from './page.ts';

// This allows us to have nice html syntax highlighting in template literals
export const html = String.raw;

export const PORT = Deno.env.get('PORT') || 8000;

export const baseUrl = 'https://deno-code-examples.onbrn.com';
export const defaultTitle = 'Deno Code Examples';
export const defaultDescription = 'Production-level code examples in a Deno app!';
export const helpEmail = 'no-reply@onbrn.com';

interface BasicLayoutOptions {
  isRunningLocally: boolean;
  currentPath: string;
  titlePrefix?: string | null;
  description?: string;
  user?: RequestHandlerParams['user'];
  session?: RequestHandlerParams['session'];
}

function basicLayout(
  htmlContent: string,
  { isRunningLocally, currentPath, titlePrefix, description, user, session }: BasicLayoutOptions,
) {
  let title = defaultTitle;

  if (titlePrefix) {
    title = `${titlePrefix} - Deno Code Examples`;
  }

  return html`
    <!doctype html>

    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">

      <title>${title}</title>
      <meta name="description" content="${description || defaultDescription}">
      <meta name="author" content="Bruno Bernardino">
      <meta property="og:title" content="${title}" />

      <link rel="alternate" type="application/rss+xml" href="/rss.xml" />
      <link rel="alternate" type="application/atom+xml" href="/atom.xml" />
      <link rel="alternate" type="application/feed+json" href="/feed.json" />

      <link rel="icon" href="/public/images/favicon.png" type="image/png">
      <link rel="apple-touch-icon" href="/public/images/favicon.png">

      ${isRunningLocally ? html`<script src="https://cdn.tailwindcss.com?plugins=forms"></script>` : ''}

      <link rel="stylesheet" href="/public/scss/style.scss">
      <link rel="stylesheet" href="/public/css/style.css">
      <link rel="stylesheet" href="/public/css/tailwind.css">
    </head>

    <body class="font-sans min-w-fit">
      ${loading()}
      <main class="w-full bg-slate-700">
        ${menu(currentPath, user, session)}
        ${htmlContent}
      </main>
      <footer class="flex justify-center w-full text-xs text-center py-6 px-6 bg-slate-900 text-slate-50">
        <span class="mr-2">by <a href="https://brunobernardino.com" class="no-underline hover:underline">Bruno Bernardino</a></span>
        <span>//</span>
        <span class="ml-2">view <a href="https://github.com/BrunoBernardino/deno-code-examples" class="no-underline hover:underline">source code</a></span>
      </footer>
      <script src="/public/js/script.js" defer></script>
    </body>
    </html>
    `;
}

export function basicLayoutResponse(htmlContent: string, options: BasicLayoutOptions) {
  const headers: HeadersInit = {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy':
      `default-src 'self'; child-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' ${
        options.isRunningLocally ? 'https://cdn.tailwindcss.com' : ''
      };`,
    'x-frame-options': 'DENY',
  };

  return new Response(basicLayout(htmlContent, options), {
    headers,
  });
}

export function isRunningLocally(urlPatternResult: URLPatternResult) {
  return urlPatternResult.hostname.input === 'localhost';
}

export function escapeHtml(unsafe: string) {
  return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function transpileTs(content: string, specifier: URL) {
  const urlStr = specifier.toString();
  const result = await transpile(specifier, {
    load(specifier: string) {
      if (specifier !== urlStr) {
        return Promise.resolve({ kind: 'module', specifier, content: '' });
      }
      return Promise.resolve({ kind: 'module', specifier, content });
    },
  });
  return result.get(urlStr) || '';
}

export async function serveFileWithTs(request: Request, filePath: string, extraHeaders?: ResponseInit['headers']) {
  const response = await serveFile(request, filePath);

  if (response.status !== 200) {
    return response;
  }

  const tsCode = await response.text();
  const jsCode = await transpileTs(tsCode, new URL('file:///src.ts'));
  const { headers } = response;
  headers.set('content-type', 'application/javascript; charset=utf-8');
  headers.delete('content-length');

  return new Response(jsCode, {
    status: response.status,
    statusText: response.statusText,
    headers,
    ...(extraHeaders || {}),
  });
}

function transpileSass(content: string) {
  const compiler = sass(content);

  return compiler.to_string('compressed') as string;
}

export async function serveFileWithSass(request: Request, filePath: string, extraHeaders?: ResponseInit['headers']) {
  const response = await serveFile(request, filePath);

  if (response.status !== 200) {
    return response;
  }

  const sassCode = await response.text();
  const cssCode = transpileSass(sassCode);
  const { headers } = response;
  headers.set('content-type', 'text/css; charset=utf-8');
  headers.delete('content-length');

  return new Response(cssCode, {
    status: response.status,
    statusText: response.statusText,
    headers,
    ...(extraHeaders || {}),
  });
}

export function formatMoney(currency: string, number: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatNumber(number: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

export function snakeToTitleCase(string: string) {
  return string.replace(
    /^_*(.)|_+(.)/g,
    (_match, group1: string, group2: string) => (group1 ? group1.toUpperCase() : ` ${group2.toUpperCase()}`),
  );
}

export function slugify(name: string) {
  const slug = name.toLocaleLowerCase().normalize()
    .replace(/\s+/g, '-'); // replace spaces

  return slug;
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDate(date: Date) {
  const month = date.getMonth();
  const year = date.getFullYear();

  const fullMonth = months[month];

  return `${fullMonth}, ${year}`;
}

function addLeadingZero(number: number) {
  if (number < 10) {
    return `0${number}`;
  }

  return number.toString();
}

export function buildRFC822Date(dateString: string) {
  const dayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthStrings = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const timeStamp = Date.parse(dateString);
  const date = new Date(timeStamp);

  const day = dayStrings[date.getDay()];
  const dayNumber = addLeadingZero(date.getUTCDate());
  const month = monthStrings[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const time = `${addLeadingZero(date.getUTCHours())}:${addLeadingZero(date.getUTCMinutes())}:00`;

  return `${day}, ${dayNumber} ${month} ${year} ${time} +0000`;
}

export interface Article {
  slug: string;
  date: string;
  title: string;
  subtitle: string;
  description: string;
  pinned?: boolean;
}

export async function getAllBlogArticles() {
  const today = new Date().toISOString().substring(0, 10);
  const articlesDirectoryPath = `${Deno.cwd()}/articles`;
  const articlesDirectory = Deno.readDir(articlesDirectoryPath);

  const articles: Article[] = [];

  for await (const articleFile of articlesDirectory) {
    if (!articleFile.isFile || !articleFile.name.endsWith('.md')) {
      continue;
    }

    const slug = articleFile.name.replace('.md', '');

    const articleFileContent = await Deno.readTextFile(`${articlesDirectoryPath}/${articleFile.name}`);
    const { attrs, body } = extract<{ title: string; subtitle: string; date: string; pinned?: boolean }>(
      articleFileContent,
    );

    // Skip if it's for a future date
    if (attrs.date > today) {
      continue;
    }

    articles.push({
      slug,
      title: attrs.title,
      date: attrs.date,
      subtitle: attrs.subtitle,
      description: body,
      pinned: attrs.pinned,
    });
  }

  articles.sort((articleA, articleB) => {
    if (articleA.date < articleB.date) {
      return 1;
    }

    if (articleA.date > articleB.date) {
      return -1;
    }

    return 0;
  });

  return articles;
}
