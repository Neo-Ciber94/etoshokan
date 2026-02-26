import { dev } from '$app/environment';

export const SESSION_COOKIE_NAME = dev
  ? 'authjs.session-token'
  : '__Secure-authjs.session-token';
