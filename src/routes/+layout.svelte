<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	type Theme = 'system' | 'light' | 'dark';

	const THEME_KEY = 'etoshokan:theme';
	let theme = $state<Theme>('system');

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
	<title>etoshokan</title>
</svelte:head>

<div class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
	<header class="reading-mode-hide border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<h1 class="text-2xl font-bold">@e-toshokan</h1>
			<select
				value={theme}
				onchange={(e) => setTheme(e.currentTarget.value as Theme)}
				class="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</div>
	</header>

	<nav class="reading-mode-hide border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
		<div class="mx-auto max-w-6xl px-6">
			<div class="flex space-x-1">
				<a
					href="/"
					class="relative px-4 py-3 text-sm font-medium transition-colors
						{$page.url.pathname === '/'
						? 'text-slate-900 dark:text-slate-50'
						: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'}"
				>
					Dictionary
					{#if $page.url.pathname === '/'}
						<div
							class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-slate-50"
						></div>
					{/if}
				</a>
				<a
					href="/ebook"
					class="relative px-4 py-3 text-sm font-medium transition-colors
						{$page.url.pathname === '/ebook'
						? 'text-slate-900 dark:text-slate-50'
						: 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'}"
				>
					Ebook Reader
					{#if $page.url.pathname === '/ebook'}
						<div
							class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-slate-50"
						></div>
					{/if}
				</a>
			</div>
		</div>
	</nav>

	<main class="mx-auto max-w-6xl px-6 py-8 reading-mode-main">
		{@render children()}
	</main>
</div>

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
