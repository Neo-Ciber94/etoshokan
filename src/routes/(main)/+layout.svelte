<script lang="ts">
	import PwaInstallPrompt from '$lib/components/PwaInstallPrompt.svelte';
	import AppNav from '$lib/components/AppNav.svelte';
	import { ModalContainer } from '$lib/components/modal';
	import SaveAsDialog from '$lib/components/SaveAsDialog.svelte';
	import EditCategoryDialog from '$lib/components/EditCategoryDialog.svelte';
	import { dictionary } from '$lib/dictionary';
	import { readingMode } from '$lib/runes/reading-mode.svelte';
	import { syncRemoteMetadata } from '$lib/data/ebook/sync.mutation';
	import { dev } from '$app/environment';
	import { authClient } from '$lib/client/auth-client';
	import { synchronizeWordsCollection } from '$lib/data/words/words-storage.svelte';

	const session = authClient.useSession();

	$effect.pre(() => {
		dictionary.initialize();
	});

	async function synchronize() {
		await Promise.all([syncRemoteMetadata(), synchronizeWordsCollection()]);
	}

	$effect.pre(() => {
		const unsubscribe = session.subscribe(synchronize);
		window.addEventListener('online', synchronize);

		return () => {
			unsubscribe();
			window.removeEventListener('online', synchronize);
		};
	});

	$effect.pre(() => {
		navigator.serviceWorker.register('/service-worker.js', {
			type: dev ? 'module' : 'classic'
		});
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#202020" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Etoshokan" />
	<title>Etoshokan</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<AppNav />

	<main
		class="main-content mx-auto {readingMode.active ? 'max-w-full p-0' : 'max-w-6xl px-6 py-8'}"
	>
		{@render children()}
	</main>
</div>

<PwaInstallPrompt />
<ModalContainer />
<SaveAsDialog />
<EditCategoryDialog />

<style>
	:global(html) {
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	/* Mobile portrait: bottom padding for fixed bottom nav */
	@media (max-width: 1024px) and (orientation: portrait) {
		.main-content {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}

	/* Mobile landscape: left padding for fixed side nav */
	@media (max-width: 1024px) and (orientation: landscape) {
		.main-content {
			padding-left: calc(4rem + 1.5rem);
		}
	}
</style>
