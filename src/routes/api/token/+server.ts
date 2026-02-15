import { auth } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({
		headers: request.headers
	});

	console.log({ session });

	const result = await auth.api.getAccessToken({
		body: {
			providerId: 'google',
			userId: session?.user.id
		}
	});

	console.log(result);
	return new Response();
};
