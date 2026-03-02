<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { useLatestAppRelease } from '$lib/data/app/app.svelte';
	import { Version } from '$lib/utils/version';
	import { getVersion } from '@tauri-apps/api/app';

	const SESSION_KEY = 'app-update-dismissed';
	const release = useLatestAppRelease();

	let open = $state(false);
	let downloadUrl = $state<string>();

	async function getTauriVersion() {
		const currentVersion = await getVersion();
		return Version.parse(currentVersion);
	}

	$effect(() => {
		if (release.loading || release.value == null) {
			return;
		}

		if (sessionStorage.getItem(SESSION_KEY)) {
			return;
		}

		const latestRelease = release.value;

		async function run() {
			const tauriVersion = await getTauriVersion();

			if (latestRelease.version.isNewerThan(tauriVersion)) {
				downloadUrl = latestRelease.downloadUrl;
				open = true;
			}
		}

		run().catch(console.error);
	});

	function handleClose() {
		if (!open) {
			return;
		}
		sessionStorage.setItem(SESSION_KEY, 'true');
		open = false;
	}
</script>

<Dialog.Root
	{open}
	onOpenChange={(v) => {
		if (!v) handleClose();
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>New Version Available</Dialog.Title>
			<Dialog.Description>
				A new version of Etoshokan is available. Download it to get the latest features and fixes.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={handleClose}>Close</Button>
			{#if downloadUrl}
				<Button
					onclick={() => {
						window.open(downloadUrl, '_blank', 'noopener,noreferrer');
						handleClose();
					}}
				>
					Download
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
