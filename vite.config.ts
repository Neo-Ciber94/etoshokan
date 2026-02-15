import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig(() => {
	return {
		server: {
			host: '0.0.0.0'
		},
		define: {
			__DATE__: `'${new Date().toISOString()}'`,
			__RELOAD_SW__: false,
			__VERSION__: `'${getVersion()}'`
		},
		plugins: [
			tailwindcss(),
			sveltekit(),
			SvelteKitPWA({
				strategies: 'injectManifest',
				registerType: 'autoUpdate',
				srcDir: 'src',
				filename: 'service-worker.ts',
				devOptions: {
					enabled: true
				},
				injectManifest: {
					globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
				}
			})
		]
	};
});

function getVersion() {
	const now = new Date();
	const day = now.getDate();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
	const ms = now.getMilliseconds();
	return `v${year}.${month}.${day}.${ms}`;
}
