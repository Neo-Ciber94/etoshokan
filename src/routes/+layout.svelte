<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Button } from '$lib/components/ui/button';

	const THEME_KEY = 'etoshokan:theme';
	//(typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null) || 'system' as const
	let theme = $state<'system' | 'light' | 'dark'>('system');

	// $effect(() => {
	// 	theme = localStorage.getItem(THEME_KEY);
	// })

	function applyTheme(t: 'system' | 'light' | 'dark') {
		const root = document.documentElement;
		if (t === 'system') {
			const useDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('dark', useDark);
		} else {
			root.classList.toggle('dark', t === 'dark');
		}
		localStorage.setItem(THEME_KEY, t);
	}

	function setTheme(t: 'system' | 'light' | 'dark') {
		theme = t;
		applyTheme(t);
	}

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
	<header class="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
			<h1 class="text-2xl font-bold">@e-toshokan</h1>
			<div class="flex items-center gap-2">
				<Button 
					variant={theme === 'system' ? 'default' : 'outline'} 
					size="sm" 
					onclick={() => setTheme('system')}
				>
					System
				</Button>
				<Button 
					variant={theme === 'light' ? 'default' : 'outline'} 
					size="sm" 
					onclick={() => setTheme('light')}
				>
					Light
				</Button>
				<Button 
					variant={theme === 'dark' ? 'default' : 'outline'} 
					size="sm" 
					onclick={() => setTheme('dark')}
				>
					Dark
				</Button>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-6 py-8">
		{@render children()}
	</main>
</div>

<style>
	:global(html) { 
		transition: color 0.15s ease, background-color 0.15s ease; 
	}
</style>
