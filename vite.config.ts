import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import dotenv from 'dotenv';
dotenv.config();

const defineProcessEnv = () => {
	const definedEnvs = Object.fromEntries(
		Object.entries(process.env || {}).map(([key, value]) => [
			`process.env.${key}`,
			JSON.stringify(value)
		])
	);

	return definedEnvs;
};

export default defineConfig({
	server: {
		host: '0.0.0.0'
	},
	define: {
		...defineProcessEnv(),
		__DATE__: `'${new Date().toISOString()}'`,
		__RELOAD_SW__: false,
		'process.env.NODE_ENV': process.env.NODE_ENV === 'production' ? '"production"' : '"development"'
	},
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'injectManifest',
			registerType: 'autoUpdate',
			devOptions: {
				enabled: true
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			}
		})
	]
});
