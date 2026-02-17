import { auth } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession(request);
	console.log({ session });
	return new Response();
};
