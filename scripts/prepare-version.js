import fs from 'node:fs/promises';
import path from 'node:path';
import * as githubCore from '@actions/core';

const TAURI_CONF = path.join(process.cwd(), '/src-tauri/tauri.config.json');

async function getVersion() {
	const versionPath = path.join(process.cwd(), '.version');
	const baseVersion = await fs.readFile(versionPath, { encoding: 'utf-8' }).then((x) => x.trim());
	githubCore.info(`🌐 base version: ${baseVersion}`);

	const now = new Date();
	const dateVersion = [
		now.getUTCFullYear(),
		String(now.getUTCMonth() + 1).padStart(2, '0'),
		String(now.getUTCDate()).padStart(2, '0'),
		String(now.getUTCHours()).padStart(2, '0'),
		String(now.getUTCMinutes()).padStart(2, '0')
	].join('');

	const version = `${baseVersion}+${dateVersion}`;
	githubCore.info(`🌐 new application version: ${version}`);
	return version;
}

async function updateTauriConfigVersion(newVersion) {
	const file = await fs.readFile(TAURI_CONF, { encoding: 'utf-8' });

	// Update tauri.config.json
	const config = JSON.parse(file);
	config.version = newVersion;

	await fs.writeFile(TAURI_CONF, JSON.stringify(config));
	githubCore.info(`🌐 Updated tauri.config.json version to: ${newVersion}`);
}

async function main() {
	const version = await getVersion();
	await updateTauriConfigVersion(version);
	githubCore.setOutput('version', version);
}

main().catch((err) => {
	const message = getErrorMessage(err);
	githubCore.setFailed(message);
});

function getErrorMessage(err) {
	return err instanceof Error ? err : 'Something went wrong';
}
