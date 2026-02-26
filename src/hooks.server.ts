import { handle as authHandle } from '$lib/server/auth';
import { dev } from '$app/environment';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const devHandle: Handle = ({ event, resolve }) => {
	if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 });
	}

	return resolve(event);
};

export const handle = sequence(devHandle, authHandle);
