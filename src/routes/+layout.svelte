<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import PwaInstallPrompt from '$lib/components/PwaInstallPrompt.svelte';
	import AppNav from '$lib/components/AppNav.svelte';
	import { dictionary } from '$lib/dictionary';
	import { readingMode } from '$lib/stores/reading-mode.svelte';

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

	<main
		class="main-content mx-auto {readingMode.active ? 'max-w-full p-0' : 'max-w-6xl px-6 py-8'}"
	>
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
