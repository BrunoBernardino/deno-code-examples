import { parse } from 'std/datetime/mod.ts';
import { renderMarkdown } from 'https://deno.land/x/markdown_renderer@0.1.3/mod.ts';

import { basicLayoutResponse, formatDate, getAllBlogArticles, html, isRunningLocally } from '/lib/utils.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';

const articles = await getAllBlogArticles();

interface ArticleArguments {
  slug: string;
}

function get({ match, user, session }: RequestHandlerParams) {
  const { slug } = match.pathname.groups as unknown as ArticleArguments;

  const article = articles.find((article) => article.slug === slug);

  if (!article) {
    throw new Error('NotFound: Article not found');
  }

  const descriptionHtml = renderMarkdown(article.description, { allowedTags: ['img'] });

  const htmlContent = html`
    <section class="page">
      <article class="article">
        <h1>${article.title}</h1>
        <h4>${article.subtitle}</h4>
        <aside>${formatDate(parse(article.date, 'yyyy-MM-dd'))}</aside>
        ${descriptionHtml}
      </article>
    </section>
  `;

  const titlePrefix = article.title;
  const description = article.subtitle;

  return basicLayoutResponse(htmlContent, {
    isRunningLocally: isRunningLocally(match),
    currentPath: match.pathname.input,
    user,
    session,
    titlePrefix,
    description,
  });
}
const blogArticlePage = page({
  get,
  accessMode: 'public',
});

export default blogArticlePage;
