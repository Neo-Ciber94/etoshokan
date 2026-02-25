/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
// import { SvelteKitPWA } from '@vite-pwa/sveltekit';

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
		test: {},
		plugins: [
			tailwindcss(),
			sveltekit()
			// SvelteKitPWA({
			// 	registerType: 'autoUpdate',
			// 	injectRegister: false,
			// 	devOptions: {
			// 		enabled: true
			// 	},
			// 	manifest: {
			// 		name: 'Etoshokan',
			// 		short_name: 'Etoshokan',
			// 		start_url: '/',
			// 		display: 'standalone',
			// 		background_color: '#0f172a',
			// 		theme_color: '#202020'
			// 	}
			// })
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
