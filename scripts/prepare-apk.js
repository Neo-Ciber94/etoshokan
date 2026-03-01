import { glob } from 'glob';
import fs from 'node:fs/promises';
import fse from 'fs-extra';
import * as githubCore from '@actions/core';

const APK_DIR = path.resolve(
	process.cwd(),
	'../src-tauri/gen/android/app/build/outputs/apk/universal/release'
);

async function getAndroidApkPath() {
	const globPattern = `${APK_DIR}/*.apk`;
	const results = await glob(globPattern);
	return results.sort()[0];
}

async function getVersion() {
	const baseVersion = await fs.readFile('../.version', { encoding: 'utf-8' }).then((x) => x.trim());
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

async function main() {
	const apkFilePath = await getAndroidApkPath();

	if (apkFilePath == null) {
		githubCore.error('Cannot find android apk on: ', APK_DIR);
		return;
	}

	const version = await getVersion();
	const newPath = `etoshokan-${version}.apk`;

	githubCore.info(`🌐 move file from '${apkFilePath}' to '${newPath}'`);
	await fse.move(apkFilePath, newPath);

	githubCore.setOutput('apk-path', newPath);
	githubCore.setOutput('apk-version', version);
}

main().catch((err) => {
	const message = getErrorMessage(err);
	githubCore.setFailed(message);
});

function getErrorMessage(err) {
	return err instanceof Error ? err : 'Something went wrong';
}
