<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import PwaInstallPrompt from '$lib/components/PwaInstallPrompt.svelte';
	import AppNav from '$lib/components/AppNav.svelte';
	import { dictionary } from '$lib/dictionary';

	$effect.pre(() => {
		dictionary.initialize();
	});

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Etoshokan</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<AppNav />

	<main class="reading-mode-main main-content mx-auto max-w-6xl px-6 py-8">
		{@render children()}
	</main>
</div>

<PwaInstallPrompt />

<style>
	:global(html) {
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	:global(body.reading-mode .reading-mode-hide) {
		display: none;
	}

	:global(body.reading-mode .reading-mode-main) {
		max-width: 100%;
		padding: 0;
		margin: 0;
	}

	/* Mobile portrait: bottom padding for fixed bottom nav */
	@media (max-width: 767px) and (orientation: portrait) {
		.main-content {
			padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
		}
	}

	/* Mobile landscape: left padding for fixed side nav */
	@media (max-width: 767px) and (orientation: landscape) {
		.main-content {
			padding-left: calc(4rem + 1.5rem);
		}
	}
</style>
