<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

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
	<header class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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

	<main class="mx-auto max-w-6xl px-6 py-8">
		{@render children()}
	</main>
</div>

<style>
	:global(html) {
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}
</style>
