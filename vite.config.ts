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
