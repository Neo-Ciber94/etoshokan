<script lang="ts">
	import { page } from '$app/stores';
	import HouseIcon from '@lucide/svelte/icons/house';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import {
		themeStore,
		setTheme,
		toggleTheme,
		isDark,
		type Theme,
		useIsDarkMode
	} from '$lib/stores/theme.svelte';
	import { readingMode } from '$lib/stores/reading-mode.svelte';

	const isDarkMode = useIsDarkMode();

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

{#if !readingMode.active}
	<!-- Desktop: top bar -->
	<header class="hidden border-b border-border bg-card md:block">
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

	<!-- Mobile: top header -->
	<header class="border-b border-border bg-card md:hidden">
		<div class="flex items-center justify-between px-4 py-3">
			<a href="/" class="text-lg font-bold transition-colors hover:text-primary"> @e-toshokan </a>
			<button
				onclick={() => {
					toggleTheme();
				}}
				class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				aria-label="Toggle theme"
			>
				{#if isDarkMode.value}
					<SunIcon class="size-5" />
				{:else}
					<MoonIcon class="size-5" />
				{/if}
			</button>
		</div>
	</header>

	<!-- Mobile portrait: bottom nav -->
	<nav
		class="fixed right-0 bottom-0 left-0 z-40 hidden border-t border-border bg-card max-md:portrait:block"
	>
		<div class="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
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

	<!-- Mobile landscape: left sidebar -->
	<nav
		class="fixed top-0 bottom-0 left-0 z-40 hidden w-16 flex-col items-center justify-center gap-4 border-r border-border bg-card max-md:landscape:flex"
	>
		<div class="flex flex-col items-center justify-center gap-4 pl-[env(safe-area-inset-left)]">
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
{/if}
