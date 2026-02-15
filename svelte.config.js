import dotenv from 'dotenv';
import cloudflareAdapter from '@sveltejs/adapter-cloudflare';
import staticAdapter from '@sveltejs/adapter-static';

dotenv.config({
	quiet: true
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: getAdapter(),
		experimental: {
			remoteFunctions: true
		},
		prerender: {
			handleUnseenRoutes: 'ignore'
		},
		csp: {
			mode: 'auto'
			// directives: {
			// 	'default-src': ['self', 'blob:'],
			// 	'script-src': ['self', 'unsafe-inline'],
			// 	'style-src': ['self', 'unsafe-inline', 'blob:'],
			// 	'img-src': ['self', 'data:', 'blob:'],
			// 	'font-src': ['self'],
			// 	'connect-src': ['self'],
			// 	'worker-src': ['self', 'blob:'],
			// 	'object-src': ['none'],
			// 	'base-uri': ['self'],
			// 	'form-action': ['self']
			// }
		}
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

function getAdapter() {
	if (process.env.ADAPTER === 'static') {
		return staticAdapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		});
	}

	return cloudflareAdapter({
		fallback: 'plaintext',
		routes: {
			include: ['/*'],
			exclude: ['<all>']
		}
	});
}

export default config;
