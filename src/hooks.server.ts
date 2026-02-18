import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

export async function handle(args) {
	const { event, resolve } = args;
	return svelteKitHandler({ event, resolve, auth, building });
}
