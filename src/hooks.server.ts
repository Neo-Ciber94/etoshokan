import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';

export async function handle({ event, resolve }) {
	// https://svelte.dev/docs/cli/devtools-json
	if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 });
	}

	return svelteKitHandler({ event, resolve, auth, building });
}
