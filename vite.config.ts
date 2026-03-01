/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

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
		plugins: [tailwindcss(), sveltekit()]
	};
});

function getVersion() {
	const versionPath = path.join(process.cwd(), '.version');
	const baseVersion = fs.readFileSync(versionPath, 'utf-8').trim();

	const now = new Date();
	const dateVersion = [
		now.getUTCFullYear(),
		String(now.getUTCMonth() + 1).padStart(2, '0'),
		String(now.getUTCDate()).padStart(2, '0'),
		String(now.getUTCHours()).padStart(2, '0'),
		String(now.getUTCMinutes()).padStart(2, '0')
	].join('');

	const version = `${baseVersion}+${dateVersion}`;
	return version;
}
