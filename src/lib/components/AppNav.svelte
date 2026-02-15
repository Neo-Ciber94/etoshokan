<script lang="ts">
	import { page } from '$app/stores';
	import HouseIcon from '@lucide/svelte/icons/house';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { themeStore, setTheme, type Theme } from '$lib/runes/theme.svelte';
	import { readingMode } from '$lib/runes/reading-mode.svelte';
	import { authClient } from '$lib/auth-client';
	import ThemeToggle from './ThemeToggle.svelte';
	import { impactFeedback } from '@tauri-apps/plugin-haptics';

	const session = authClient.useSession();

	const navItems = [
		{ href: '/', label: 'Home', icon: HouseIcon },
		{ href: '/ebook', label: 'Ebook', icon: BookOpenIcon },
		{ href: '/dictionary', label: 'Dictionary', icon: LanguagesIcon },
		{ href: '/settings', label: 'Settings', icon: SettingsIcon }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') {
			return pathname === '/';
		}

		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

{#if !readingMode.active}
	<!-- Desktop: top bar -->
	<header class="border-b border-border bg-card py-1 lg:py-2">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6">
			<div class="pl-0 max-lg:landscape:pl-16">
				<a
					href="/"
					class="shrink-0 text-base font-bold transition-colors hover:text-primary lg:text-2xl"
				>
					@e-toshokan
				</a>
			</div>

			<nav class="hidden items-center space-x-1 lg:flex">
				{#each navItems as item}
					{@const active = isActive(item.href, $page.url.pathname)}
					<a
						href={item.href}
						class="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
						{active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
						onclick={() => impactFeedback('soft')}
					>
						<item.icon class="size-4" />
						{item.label}
						{#if active}
							<div class="absolute right-0 bottom-0 left-0 h-0.5 bg-primary"></div>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="flex items-center gap-3">
				<select
					value={themeStore.value}
					onchange={(e) => setTheme(e.currentTarget.value as Theme)}
					class="hidden rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground md:block"
				>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>

				<ThemeToggle classname="md:hidden block" />

				{#if $session.data?.user?.image}
					<img
						src={$session.data.user.image}
						alt={$session.data.user.name || 'User'}
						class="size-8 rounded-full object-cover"
						referrerpolicy="no-referrer"
					/>
				{/if}
			</div>
		</div>
	</header>

	<!-- Mobile portrait: bottom nav -->
	<nav
		class="fixed right-0 bottom-0 left-0 z-40 hidden border-t border-border bg-card pb-[env(safe-area-inset-bottom)] max-lg:portrait:block"
	>
		<div class="flex items-center justify-around">
			{#each navItems as item}
				{@const active = isActive(item.href, $page.url.pathname)}
				<a
					href={item.href}
					class="flex flex-col items-center gap-1 px-3 py-2 transition-colors
					{active ? 'text-primary' : 'text-muted-foreground'}"
					onclick={() => impactFeedback('soft')}
				>
					<item.icon class="size-5" />
					<span class="text-[10px] font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>

	<!-- Mobile landscape: left sidebar -->
	<nav
		class="fixed top-0 bottom-0 left-0 z-40 hidden w-16 flex-col items-center justify-center gap-4 border-r border-border bg-card max-lg:landscape:flex"
	>
		<div
			class="flex flex-col items-center justify-center gap-4 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
		>
			{#each navItems as item}
				{@const active = isActive(item.href, $page.url.pathname)}
				<a
					href={item.href}
					class="flex flex-col items-center gap-0.5 rounded-lg p-2 transition-colors
					{active ? 'bg-accent text-primary' : 'text-muted-foreground hover:text-foreground'}"
					onclick={() => impactFeedback('soft')}
				>
					<item.icon class="size-5" />
					<span class="text-[10px] font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
{/if}
