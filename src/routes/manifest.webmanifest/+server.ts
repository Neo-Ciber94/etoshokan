import type { WebAppManifest } from 'web-app-manifest';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const prerender = true;

export function GET(): Response {
	const manifest: WebAppManifest = {
		name: dev ? 'Etoshokan (Dev)' : 'Etoshokan',
		short_name: 'Etoshokan',
		description: 'Ebook reader with Japanese translations',
		start_url: '/',
		display: 'standalone',
		background_color: '#0f172a',
		theme_color: '#202020',
		icons: [
			{
				src: '/favicon.ico',
				sizes: '48x48',
				type: 'image/x-icon'
			}
		]
	};

	return json(manifest, {
		headers: {
			'Content-Type': 'application/manifest+json'
		}
	});
}
