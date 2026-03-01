<script lang="ts">
	import { openModal } from '$lib/components/modal';
	import { isTauri } from '$lib/utils/isWeb';
	import { Version } from '$lib/utils/version';
	import { getLatestAppRelease } from '$remote/app.remote';
	import { getVersion } from '@tauri-apps/api/app';

	async function getTauriVersion() {
		//const currentVersion = await getVersion();
		return Version.parse('0.0.1+100');
	}

	async function getAndParseLatestRelease() {
		const result = await getLatestAppRelease();

		if (!result.success) {
			throw new Error(result.error);
		}

		return {
			downloadUrl: result.data.downloadUrl,
			version: Version.from(result.data.version)
		};
	}

	$effect.pre(() => {
		// if (!isTauri()) {
		// 	return;
		// }

		async function run() {
			const [tauriVersion, latestRelease] = await Promise.all([
				getTauriVersion(),
				getAndParseLatestRelease()
			]);

			const { downloadUrl, version: latestVersion } = latestRelease;

			if (latestVersion.isNewerThan(tauriVersion)) {
				openModal({
					title: 'New apk version available',
					type: 'info'
				});
			}

			console.log(latestVersion);
		}

		run().catch(console.error);
	});
</script>
