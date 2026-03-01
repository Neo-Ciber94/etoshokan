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
		theme_color: '#ec003f',
		icons: [
			{
				src: '/app-icon-32.png',
				sizes: '32x32',
				type: 'image/png'
			},
			{
				src: '/app-icon-256.png',
				sizes: '256x256',
				type: 'image/png'
			}
		]
	};

	return json(manifest, {
		headers: {
			'Content-Type': 'application/manifest+json'
		}
	});
}
