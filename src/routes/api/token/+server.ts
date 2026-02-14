import { auth } from '$lib/server/auth';

export async function GET() {
	const result = await auth.api.getAccessToken({
		body: {
			providerId: 'google'
		}
	});

	console.log(result);
	return new Response();
}
