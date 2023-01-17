export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  expires_at: Date;
  last_seen_at: Date;
  created_at: Date;
}

export const FONT_STYLES = [
  'helvetica',
  'courier',
  'helvetica_italic',
] as const;
export type FontStyle = typeof FONT_STYLES[number];

export interface FilledForm {
  id: string;
  date: string;
  url: string;
}
