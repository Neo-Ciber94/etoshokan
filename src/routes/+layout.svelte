<script lang="ts">
	import './layout.css';
	import PwaInstallPrompt from '$lib/components/PwaInstallPrompt.svelte';
	import AppNav from '$lib/components/AppNav.svelte';
	import { ModalContainer } from '$lib/components/modal';
	import { dictionary } from '$lib/dictionary';
	import { readingMode } from '$lib/runes/reading-mode.svelte';
	import { hasLocalBooksMetadata } from '$lib/ebook/books.query';
	import { syncRemoteMetadata } from '$lib/ebook/sync.mutation';
	import { dev } from '$app/environment';

	$effect.pre(() => {
		dictionary.initialize();
	});

	$effect.pre(() => {
		async function run() {
			const hasAnyData = await hasLocalBooksMetadata();

			if (hasAnyData) {
				return;
			}

			await syncRemoteMetadata();
		}

		run();
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
