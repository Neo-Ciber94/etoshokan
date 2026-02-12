import cloudflareAdapter from '@sveltejs/adapter-cloudflare';
import staticAdapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: getAdapter()
	}
};

function getAdapter() {
	if (process.env.STATIC_BUILD) {
		return staticAdapter({
			pages: 'build',
			assets: 'build',
			fallback: "index.html",
			precompress: false,
			strict: true
		});
	}

	cloudflareAdapter({
		fallback: 'plaintext',
		routes: {
			include: ['/*'],
			exclude: ['<all>']
		}
	});
}

export default config;
