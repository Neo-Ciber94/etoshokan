import * as client from '@auth/sveltekit/client';
import { sessionStore } from './session-store';

export const authClient = {
	signIn: {
		social: ({ provider, callbackURL }: { provider: string; callbackURL?: string }) => {
			return client.signIn(provider, { callbackUrl: callbackURL });
		}
	},

	signOut: async () => {
		await client.signOut();
		sessionStore.invalidate();
	}
};

// export async function clientAuthSignIn({
//   provider,
//   callbackURL
// }: {
//   provider: string
//   callbackURL?: string
// }) {
//   try {
//     await authClient.signIn.social({ provider, callbackURL })
//     return { success: true } as const
//   } catch (err) {
//     console.error(err)
//     const error = err instanceof Error ? err.message : 'Failed to login'
//     return { success: false, error } as const
//   }
// }
