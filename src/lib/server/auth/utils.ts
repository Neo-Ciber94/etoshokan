import { getRequestEvent } from '$app/server';
import { auth } from '.';

export async function getGoogleAuthToken() {
	try {
		const { request } = getRequestEvent();
		const session = await auth.api.getSession(request);

		if (session == null) {
			return session;
		}

		const authToken = await auth.api.getAccessToken({
			body: {
				providerId: 'google',
				userId: session.user.id
			}
		});

		return authToken;
	} catch (err) {
		console.error('Failed to get google access token', err);
		return null;
	}
}
