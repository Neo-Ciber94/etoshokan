import { glob } from 'glob';
import path from 'node:path';

import fse from 'fs-extra';
import * as githubCore from '@actions/core';

const APK_DIR = path.join(
	process.cwd(),
	'/src-tauri/gen/android/app/build/outputs/apk/universal/release'
);

async function getAndroidApkPath() {
	const globPattern = `${APK_DIR}/*.apk`;
	const results = await glob(globPattern);
	return results.sort()[0];
}

async function main() {
	const apkFilePath = await getAndroidApkPath();

	if (apkFilePath == null) {
		githubCore.error('Cannot find android apk on: ', APK_DIR);
		return;
	}

	const version = process.env.VERSION;
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
