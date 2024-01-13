import { encodeBase64 } from 'std/encoding/base64.ts';

import { addTextToForm } from '/lib/pdf-utils.ts';
import { uploadUserFile } from '/lib/providers/aws.ts';
import { FONT_STYLES, FontStyle, User } from '/lib/types.ts';
import { FormField, generateFieldHtml, getFormDataField } from '/lib/form-utils.ts';
import page, { RequestHandlerParams } from '/lib/page.ts';
import { basicLayoutResponse, html, isRunningLocally, snakeToTitleCase } from '/lib/utils.ts';
import { cacheNewFilledForm } from '/lib/data-utils.ts';
import { sendFilledFormEmail } from '/lib/providers/postmark.ts';

const TITLE_PREFIX = 'Fill a form!';

interface FillFormSaveEmailOptions {
  id: string;
  name: string;
  email: string;
  fontStyle: FontStyle;
}

// Fill form, upload to S3, save in simple cache, and email with attachment
async function fillFormSaveAndEmail(
  match: URLPatternResult,
  user: User,
  { id, name, email, fontStyle }: FillFormSaveEmailOptions,
) {
  const filledFormFile = await Deno.readFile(
    `${Deno.cwd()}/public/forms/to-fill.pdf`,
  );

  // Fill form
  let filledFormContents = await addTextToForm(filledFormFile, {
    text: name,
    x: 72,
    y: 122,
    size: 10,
    pageIndex: 0,
    fontStyle,
  });
  filledFormContents = await addTextToForm(filledFormContents, {
    text: email,
    x: 72,
    y: 108,
    size: 10,
    pageIndex: 0,
    fontStyle,
  });

  const tomorrow = new Date(new Date().setUTCDate(new Date().getUTCDate() + 1));

  // Upload to S3
  const signedFilledFormUrl = await uploadUserFile(
    user.id,
    `${id.substring(0, 4)}-filled-form.pdf`,
    'application/pdf',
    filledFormContents,
    {
      Expires: tomorrow,
    },
  );

  // Save URL in simple cache
  await cacheNewFilledForm(id, user.id, signedFilledFormUrl);

  // Send email with attachment
  const attachments = [{
    Name: `${id.substring(0, 4)}-filled-form.pdf`,
    ContentType: 'application/pdf',
    Content: encodeBase64(filledFormContents),
  }];

  await sendFilledFormEmail(match, user, attachments);
}

async function post({ request, match, user, session }: RequestHandlerParams) {
  let notificationHtml = '';
  let errorMessage = '';

  let formData = new FormData();

  try {
    formData = await request.formData();

    formFields(user!).forEach((field) => {
      if (field.required) {
        const value = formData.get(field.name);

        if (!value) {
          throw new Error(`${field.label} is required`);
        }
      }
    });

    const formToFill: FillFormSaveEmailOptions = {
      id: crypto.randomUUID(),
      name: getFormDataField(formData, 'name'),
      email: getFormDataField(formData, 'email'),
      fontStyle: getFormDataField(formData, 'font_style') as FontStyle,
    };

    await fillFormSaveAndEmail(match, user!, formToFill);

    return new Response('Form filled successfully!', {
      status: 302,
      headers: { 'Location': `/dashboard?filledForm=${formToFill.id}` },
    });
  } catch (error) {
    console.error(error);
    errorMessage = error.toString();

    notificationHtml = html`
      <section class="notification-error">
        <h3>Failed to fill form:</h3>
        <p>${errorMessage}</p>
      </section>
    `;
  }

  const htmlContent = defaultHtmlContent(
    user!,
    formData,
    notificationHtml,
  );

  return basicLayoutResponse(htmlContent, {
    isRunningLocally: isRunningLocally(match),
    currentPath: match.pathname.input,
    titlePrefix: TITLE_PREFIX,
    user,
    session,
  });
}

function get({ user, match, session }: RequestHandlerParams) {
  const htmlContent = defaultHtmlContent(user!, new FormData());

  return basicLayoutResponse(htmlContent, {
    isRunningLocally: isRunningLocally(match),
    currentPath: match.pathname.input,
    titlePrefix: TITLE_PREFIX,
    user,
    session,
  });
}

function formFields(user: User) {
  const formLinkHtml =
    html`<a href="/public/forms/to-fill.pdf" target="_blank" rel="noopener noreferrer" class="decoration-sky-700 underline text-sky-700 hover:decoration-slate-800 hover:text-slate-800">this form</a>`;
  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Name',
      description: `The name that will be filled in ${formLinkHtml}.`,
      type: 'text',
      placeholder: 'Jane Doe',
      value: user.name,
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      description:
        `The email that will be filled in ${formLinkHtml} (not the email that will receive the form — that will always be "${user.email}").`,
      type: 'email',
      placeholder: 'jane.doe@example.com',
      value: user.email,
      required: true,
    },
    {
      name: 'font_style',
      label: 'Font style',
      description: 'The font style to be used for the text filling the form. See a preview below.',
      type: 'select',
      options: FONT_STYLES.map((fontStyle) => ({ label: snakeToTitleCase(fontStyle), value: fontStyle })),
      required: true,
      value: 'helvetica' as FontStyle,
    },
  ];

  return fields;
}

function defaultHtmlContent(
  user: User,
  formData: FormData,
  notificationHtml = '',
) {
  const currentFontStyle = (formData.get('font_style') || 'helvetica') as FontStyle;
  const fontStylesPreviewHtml = FONT_STYLES.map((fontStyle) => {
    const isVisible = fontStyle === currentFontStyle;
    return html`<aside class="${
      isVisible ? 'block' : 'hidden'
    } rounded-md shadow-md text-center hover:shadow-xl px-2 py-x w-full max-w-xs mx-auto" data-font-type="${fontStyle}">
    <img src="/public/images/preview-font-style-${fontStyle}.svg" alt="The ${
      snakeToTitleCase(fontStyle)
    } font style preview" />
  </aside>`;
  }).join('\n');

  return html`
    <section class="page">
      <h1 class="text-4xl mb-6">
        Fill a form
      </h1>
      ${notificationHtml}
      
      <form action="/fill-a-form" method="POST" class="">
        ${formFields(user).map((field) => generateFieldHtml(field, formData)).join('\n')}
        ${fontStylesPreviewHtml}
        <section class="flex justify-center mt-8 mb-4">
          <button class="button" type="submit">Fill the form, send an email</button>
        </section>
      </form>
    </section>

    <script src="/public/ts/fill-a-form.ts" type="module" defer></script>
  `;
}

const fillAFormPage = page({
  get,
  post,
  accessMode: 'user',
});

export default fillAFormPage;
