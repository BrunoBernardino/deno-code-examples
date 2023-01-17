import { basicLayoutResponse, html, isRunningLocally } from '/lib/utils.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';
import { getFilledFormsForUser } from '/lib/data-utils.ts';
import { FilledForm } from '/lib/types.ts';

async function get({ request, match, user, session }: RequestHandlerParams) {
  const urlSearchParams = new URL(request.url).searchParams;

  let notificationHtml = '';
  let filledFormId = '';

  if (urlSearchParams.has('filledForm')) {
    filledFormId = urlSearchParams.get('filledForm') || '';
    notificationHtml = html`
      <section class="notification-success">
        <h3>Form filled successfully!</h3>
        <p>Please find the URL below. Note you should also be receiving an email with the filled form attached.</p>
      </section>
    `;
  }

  const filledForms = await getFilledFormsForUser(user!.id);

  if (filledForms.length === 0 || !filledForms.some((form) => form.id === filledFormId)) {
    notificationHtml = '';
  }

  const htmlContent = html`
    <section class="page">
      <h1 class="text-4xl mb-6 text-center">
        Welcome, <span class="font-bold">${user!.name}</span>.
      </h1>

      <p class="text-center">Your email is <span class="font-bold">${user!.email}</span>.</p>

      <p class="text-center mt-2 mb-6">Don't worry. All data is deleted every day.</p>

      ${notificationHtml}

      <section class="text-center flex flex-col justify-center items-center grow-0 my-6">
        <a class="w-auto max-w-s my-2 button" href="/fill-a-form">
          Fill a form
        </a>
      </section>

      ${renderFilledFormsHtml(filledForms, filledFormId)}
    </section>
  `;

  return basicLayoutResponse(htmlContent, {
    isRunningLocally: isRunningLocally(match),
    currentPath: match.pathname.input,
    titlePrefix: 'Dashboard',
    user,
    session,
  });
}

function renderFilledFormsHtml(filledForms: FilledForm[], newFilledFormId = '') {
  if (filledForms.length === 0) {
    return '';
  }

  const formsListHtml = filledForms.map((form) => {
    const justCreatedHtml = newFilledFormId === form.id
      ? html`<span class="float-left relative h-3 w-3 ml-8 -mt-3">
      <span class="motion-safe:animate-pulse relative inline-flex rounded-full h-3 w-3 bg-green-500 cursor-help" title="Just created!"></span>
    </span>`
      : '';

    return html`<tr>
      <td>${form.id.substring(0, 4)}${justCreatedHtml}</td>
      <td>${new Date(form.date).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</td>
      <td class="text-right"><a href="/file/${form.url}" title="Download">↡</a></td>
    </tr>`;
  }).join('\n');

  return html`
  <h2 class="text-2xl mb-6">
    Filled forms
  </h2>

  <section class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Date</th>
          <th class="text-right"></th>
        </tr>
      </thead>
      <tbody>${formsListHtml}</tbody>
    </table>
  </section>`;
}

const dashboardPage = page({
  get,
  accessMode: 'user',
});

export default dashboardPage;
