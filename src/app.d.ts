declare module '@auth/core/types' {
	interface Session {
		access_token: string;
		error?: string;
	}
}

declare module '@auth/core/jwt' {
	interface JWT {
		access_token?: string;
		refresh_token?: string;
		access_token_expires_at?: number;
		error?: string;
	}
}

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			auth: () => Promise<import('@auth/core/types').Session | null>;
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
