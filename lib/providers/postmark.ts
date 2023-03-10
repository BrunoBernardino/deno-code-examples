import 'std/dotenv/load.ts';

import { User } from '/lib/types.ts';
import { baseUrl, helpEmail, isRunningLocally, PORT } from '/lib/utils.ts';

const POSTMARK_SERVER_API_TOKEN = Deno.env.get('POSTMARK_SERVER_API_TOKEN') || '';

interface PostmarkResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

type TemplateAlias = 'send-filled-form';

function getApiRequestHeaders() {
  return {
    'X-Postmark-Server-Token': POSTMARK_SERVER_API_TOKEN,
    'Accept': 'application/json; charset=utf-8',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

interface PostmarkEmailWithTemplateRequestBody {
  TemplateId?: number;
  TemplateAlias: TemplateAlias;
  TemplateModel: {
    [key: string]: any;
  };
  InlineCss?: boolean;
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  Tag?: string;
  ReplyTo?: string;
  Headers?: { Name: string; Value: string }[];
  TrackOpens?: boolean;
  TrackLinks?: 'None' | 'HtmlAndText' | 'HtmlOnly' | 'TextOnly';
  Attachments?: { Name: string; Content: string; ContentType: string }[];
  Metadata?: {
    [key: string]: string;
  };
  MessageStream: 'outbound' | 'broadcast';
}

async function sendEmailWithTemplate(
  to: string,
  templateAlias: TemplateAlias,
  data: PostmarkEmailWithTemplateRequestBody['TemplateModel'],
  attachments: PostmarkEmailWithTemplateRequestBody['Attachments'] = [],
  cc?: string,
) {
  const email: PostmarkEmailWithTemplateRequestBody = {
    From: helpEmail,
    To: to,
    TemplateAlias: templateAlias,
    TemplateModel: data,
    MessageStream: 'outbound',
  };

  if (attachments?.length) {
    email.Attachments = attachments;
  }

  if (cc) {
    email.Cc = cc;
  }

  const postmarkResponse = await fetch('https://api.postmarkapp.com/email/withTemplate', {
    method: 'POST',
    headers: getApiRequestHeaders(),
    body: JSON.stringify(email),
  });
  const postmarkResult = (await postmarkResponse.json()) as PostmarkResponse;

  if (postmarkResult.ErrorCode !== 0 || postmarkResult.Message !== 'OK') {
    console.log(JSON.stringify({ postmarkResult }, null, 2));
    throw new Error(`Failed to send email "${templateAlias}"`);
  }
}

export async function sendFilledFormEmail(
  match: URLPatternResult,
  user: User,
  attachments: PostmarkEmailWithTemplateRequestBody['Attachments'],
) {
  const dashboardUrl = `${isRunningLocally(match) ? `http://localhost:${PORT}` : baseUrl}/dashboard`;

  const data = {
    userName: user.name,
    dashboardUrl,
  };

  await sendEmailWithTemplate(user.email, 'send-filled-form', data, attachments);
}
