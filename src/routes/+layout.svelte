<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import { page } from '$app/stores';
	import PwaInstallPrompt from '$lib/components/PwaInstallPrompt.svelte';
	import { dictionary } from '$lib/dictionary';

	type Theme = 'system' | 'light' | 'dark';

	const THEME_KEY = 'etoshokan:theme';
	let theme = $state<Theme>('system');

	$effect.pre(() => {
		dictionary.initialize();
	});

	function setTheme(value: Theme) {
		const root = document.documentElement;
		let isDark = false;
		theme = value;

		switch (value) {
			case 'system':
				isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				break;
			case 'light':
				isDark = false;
				break;
			case 'dark':
				isDark = true;
				break;
		}

		if (isDark) {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}

		localStorage.setItem(THEME_KEY, value);
	}

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Etoshokan</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">
	<header class="reading-mode-hide border-b border-border bg-card">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<a href="/" class="text-2xl font-bold hover:text-primary transition-colors">@e-toshokan</a>
			<select
				value={theme}
				onchange={(e) => setTheme(e.currentTarget.value as Theme)}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</div>
	</header>

	<nav class="reading-mode-hide border-b border-border bg-card">
		<div class="mx-auto max-w-6xl px-6">
			<div class="flex space-x-1">
				<a
					href="/ebook"
					class="relative px-4 py-3 text-sm font-medium transition-colors
						{$page.url.pathname === '/ebook'
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Ebook Reader
					{#if $page.url.pathname === '/ebook'}
						<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"></div>
					{/if}
				</a>
				<a
					href="/dictionary"
					class="relative px-4 py-3 text-sm font-medium transition-colors
						{$page.url.pathname === '/dictionary'
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Dictionary
					{#if $page.url.pathname === '/dictionary'}
						<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"></div>
					{/if}
				</a>
				<a
					href="/settings"
					class="relative px-4 py-3 text-sm font-medium transition-colors
						{$page.url.pathname === '/settings'
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Settings
					{#if $page.url.pathname === '/settings'}
						<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"></div>
					{/if}
				</a>
			</div>
		</div>
	</nav>

	<main class="reading-mode-main mx-auto max-w-6xl px-6 py-8">
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
</style>
