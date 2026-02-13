<script lang="ts">
	import { page } from '$app/stores';
	import HouseIcon from '@lucide/svelte/icons/house';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { themeStore, setTheme, toggleTheme, isDark, type Theme } from '$lib/stores/theme.svelte';

	let dark = $state(false);

	$effect(() => {
		// Re-evaluate when themeStore.value changes
		themeStore.value;
		dark = isDark();
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: HouseIcon },
		{ href: '/ebook', label: 'Ebook', icon: BookOpenIcon },
		{ href: '/dictionary', label: 'Dictionary', icon: LanguagesIcon },
		{ href: '/settings', label: 'Settings', icon: SettingsIcon }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<!-- Desktop: merged header + nav top bar -->
<header class="nav-desktop reading-mode-hide border-b border-border bg-card">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6">
		<a href="/" class="shrink-0 text-2xl font-bold transition-colors hover:text-primary">
			@e-toshokan
		</a>

		<nav class="flex items-center space-x-1">
			{#each navItems as item}
				{@const active = isActive(item.href, $page.url.pathname)}
				<a
					href={item.href}
					class="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
						{active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				>
					<item.icon class="size-4" />
					{item.label}
					{#if active}
						<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"></div>
					{/if}
				</a>
			{/each}
		</nav>

		<select
			value={themeStore.value}
			onchange={(e) => setTheme(e.currentTarget.value as Theme)}
			class="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
		>
			<option value="system">System</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</div>
</header>

<!-- Mobile: top header with title and theme toggle -->
<header class="nav-mobile-header reading-mode-hide border-b border-border bg-card">
	<div class="flex items-center justify-between px-4 py-3">
		<a href="/" class="text-lg font-bold transition-colors hover:text-primary">
			@e-toshokan
		</a>
		<button
			onclick={() => { toggleTheme(); dark = isDark(); }}
			class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			aria-label="Toggle theme"
		>
			{#if dark}
				<SunIcon class="size-5" />
			{:else}
				<MoonIcon class="size-5" />
			{/if}
		</button>
	</div>
</header>

<!-- Mobile portrait: bottom footer nav -->
<nav class="nav-mobile-bottom reading-mode-hide fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card">
	<div class="nav-mobile-bottom-inner flex items-center justify-around">
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 px-3 py-2 transition-colors
					{active ? 'text-primary' : 'text-muted-foreground'}"
			>
				<item.icon class="size-5" />
				<span class="text-[10px] font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

<!-- Mobile landscape: left sidebar nav -->
<nav class="nav-mobile-side reading-mode-hide fixed top-0 bottom-0 left-0 z-40 flex-col items-center justify-center gap-4 border-r border-border bg-card">
	<div class="nav-mobile-side-inner flex flex-col items-center justify-center gap-4">
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class="flex flex-col items-center gap-0.5 rounded-lg p-2 transition-colors
					{active ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground'}"
			>
				<item.icon class="size-5" />
				<span class="text-[10px] font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	/* Desktop: visible at md+ */
	.nav-desktop {
		display: none;
	}
	@media (min-width: 768px) {
		.nav-desktop {
			display: block;
		}
	}

	/* Mobile header: visible below md */
	.nav-mobile-header {
		display: none;
	}
	@media (max-width: 767px) {
		.nav-mobile-header {
			display: block;
		}
	}

	/* Mobile bottom: visible below md in portrait */
	.nav-mobile-bottom {
		display: none;
	}
	@media (max-width: 767px) and (orientation: portrait) {
		.nav-mobile-bottom {
			display: block;
		}
	}
	.nav-mobile-bottom-inner {
		padding-bottom: env(safe-area-inset-bottom);
	}

	/* Mobile side: visible below md in landscape */
	.nav-mobile-side {
		display: none;
	}
	@media (max-width: 767px) and (orientation: landscape) {
		.nav-mobile-side {
			display: flex;
			width: 4rem;
		}
	}
	.nav-mobile-side-inner {
		padding-left: env(safe-area-inset-left);
	}
</style>
