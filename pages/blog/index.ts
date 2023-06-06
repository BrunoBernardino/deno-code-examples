import { parse } from 'std/datetime/mod.ts';

import { Article, basicLayoutResponse, formatDate, getAllBlogArticles, html, isRunningLocally } from '/lib/utils.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

async function get({ match, user, session }: RequestHandlerParams) {
  const articles = await getAllBlogArticles();

  const htmlContent = html`
    <section class="page">
      <h1 class="text-4xl mb-6 text-center">
        Blog Example!
      </h1>
      <section class="my-8">
        ${articles.map((article) => articleHtmlContent(article)).join('')}
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

function articleHtmlContent({ slug, title, subtitle, date }: Article) {
  return html`
    <a href="${`/blog/${slug}`}" class="py-5 px-3 m-4 flex-1 flex border-b-2 border-b-slate-200 hover:border-b-sky-200 hover:bg-sky-50">
      <aside class="w-24 mr-2 text-slate-400 text-sm">${formatDate(parse(date, 'yyyy-MM-dd'))}</aside>
      <article>
        <h4 class="font-bold text-lg">${title}</h4>
        <p class="text-base">${subtitle}</p>
      </article>
    </a>
  `;
}

const blogPage = page({
  get,
  accessMode: 'public',
});

export default blogPage;
