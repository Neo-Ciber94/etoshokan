# Etoshokan Project Memory

## Auth System
- Migrated from better-auth to **@auth/sveltekit** (Auth.js v5)
- Databaseless — JWT strategy only, no adapter
- Config: `src/lib/server/auth/index.ts` exports `{ handle, signIn, signOut }`
- `hooks.server.ts` uses `sequence(devHandle, authHandle)`
- Env var: `AUTH_SECRET` (was `BETTER_AUTH_SECRET`)
- Google tokens stored in JWT: `access_token`, `refresh_token`, `access_token_expires_at`
- `jwt` callback auto-refreshes Google access token when expired (60s buffer)
- `session` callback exposes `access_token` and `error` on the session object
- Auth.js routes at base path `/api/auth` (set via `basePath: '/api/auth'` in config)
- Auth.js routes are served by the `handle` hook (no `[...auth]/+server.ts` route file needed)
- Session cookie name defined in `src/lib/server/auth/session-cookie.ts` — shared by auth config AND route handlers

## Deeplink / Tauri Handoff Flow

- `/auth/deeplink-handoff` (GET) — reads session cookie, creates encrypted handoff token, redirects to `etoshokan://auth/callback?token=...`
- `/auth/exchange-token` (GET) — decrypts handoff token, sets session cookie, redirects to `/`
- Cookie name constant: `SESSION_COOKIE_NAME` from `$lib/server/auth/session-cookie.ts`
  - dev: `authjs.session-token`, prod: `__Secure-authjs.session-token`
- Handoff encrypted with `AUTH_SECRET` via AES

## Client Auth (`src/lib/client/auth-client.ts`)

- `authClient.useSession()` — singleton Svelte store fetching `/api/auth/session`
- Store shape: `{ data: Session | null, isPending: boolean }`
- `authClient.signIn.social({ provider, callbackURL })` — POST to `/api/auth/signin/{provider}` with `X-Auth-Return-Redirect: 1`, follows returned URL
- `authClient.signOut()` — POST to `/api/auth/signout` with `X-Auth-Return-Redirect: 1`
- `isLoggedIn()` — fetches `/api/auth/session` to check login status
- App is `ssr=false` / `prerender=true` so session is fetched client-side only

## Key File Locations
- Auth config: `src/lib/server/auth/index.ts`
- Session cookie constant: `src/lib/server/auth/session-cookie.ts`
- Google token refresh: `src/lib/server/auth/googleAuth.ts`
- Handoff encrypt/decrypt: `src/lib/server/auth/handoff.ts`
- Client auth store: `src/lib/client/auth-client.ts`
- Deeplink handoff route: `src/routes/auth/deeplink-handoff/+server.ts`
- Exchange token route: `src/routes/auth/exchange-token/+server.ts`

## Tech Stack
- SvelteKit 2 + Svelte 5 (runes), TypeScript strict, Tailwind CSS 4, shadcn-svelte
- Package manager: **bun** (never npm/npx — use bunx)
- Database: Drizzle ORM + libsql (Turso)
- Deployment: Cloudflare (adapter-cloudflare), Android (Tauri)
- No semicolons, 2-space indent
