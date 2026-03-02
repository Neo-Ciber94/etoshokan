<script lang="ts">
	import { dictionary } from '$lib/dictionary';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { themeStore, setTheme, type Theme } from '$lib/runes/theme.svelte';
	import { translateSelectionEnabled } from '$lib/runes/translate-selection.svelte';
	import { authClient } from '$lib/client/auth-client';
	import { clearSyncEntries, syncRemoteMetadata } from '$lib/data/ebook/sync.mutation';
	import { clearLocalBooks } from '$lib/data/ebook/books.mutation';
	import { isTauri } from '$lib/utils/isWeb';
	import { getVersion } from '@tauri-apps/api/app';

	const session = authClient.useSession();
	const dict = dictionary;

	let loading = $state(false);
	let error = $state('');
	let success = $state('');
	let tauriVersion = $state('<unknown>');

	$effect.pre(() => {
		if (!isTauri()) {
			return;
		}

		getVersion().then((version) => {
			tauriVersion = version;
		});
	});

	async function clearCache() {
		if (!confirm('Delete all cache data? (Remote data will NOT be deleted)')) {
			return;
		}

		loading = true;
		error = '';
		success = '';

		try {
			await Promise.all([clearSyncEntries(), clearLocalBooks(), dict.clear()]);
			await Promise.all([dict.initialize(), syncRemoteMetadata()]);
			success = 'Cache cleared and dictionary reloaded successfully.';
		} catch (err) {
			console.error(err);
			error = (err && (err as any).message) || String(err);
		} finally {
			loading = false;
		}
	}

	async function logout() {
		await authClient.signOut();
	}
</script>

<svelte:head>
	<title>Etoshokan - Settings</title>
</svelte:head>

<div class="space-y-8">
	<section class="space-y-2">
		<h2 class="text-xl font-semibold">Settings</h2>
		<p class="text-sm text-muted-foreground">Manage app settings and data</p>
	</section>

	<section class="space-y-4">
		<h3 class="text-lg font-semibold">Appearance</h3>
		<div class="flex flex-col gap-3 rounded-md border border-border p-4">
			<div class="space-y-1">
				<p class="text-sm font-medium">Theme</p>
				<p class="text-xs text-muted-foreground">Choose your preferred color scheme</p>
			</div>
			<select
				value={themeStore.value}
				onchange={(e) => setTheme(e.currentTarget.value as Theme)}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-48"
			>
				<option value="system">System</option>
				<option value="light">Light</option>
				<option value="dark">Dark</option>
			</select>
		</div>
	</section>

	<section class="space-y-4">
		<h3 class="text-lg font-semibold">Dictionary</h3>
		<div class="flex items-center justify-between rounded-md border border-border p-4">
			<div class="space-y-1">
				<p class="text-sm font-medium">Translate on selection</p>
				<p class="text-xs text-muted-foreground">
					Show a quick translation card when text is selected outside the reader.
				</p>
			</div>
			<Switch bind:checked={translateSelectionEnabled.value} />
		</div>
		<div class="flex flex-col gap-3 rounded-md border border-border p-4">
			<div class="space-y-1">
				<p class="text-sm font-medium">Reset Dictionary Cache</p>
				<p class="text-xs text-muted-foreground">
					Clears the cached dictionary data and re-downloads it. Use this if the dictionary isn't
					working correctly.
				</p>
			</div>
			<div>
				<Button variant="destructive" onclick={clearCache} disabled={loading}>
					{loading ? 'Resetting...' : 'Reset Cache'}
				</Button>
			</div>

			{#if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
					{success}
				</div>
			{/if}
		</div>
	</section>

	{#if $session.data}
		<section class="space-y-4">
			<h3 class="text-lg font-semibold">Account</h3>
			<div class="flex flex-col gap-3 rounded-md border border-border p-4">
				<div class="space-y-1">
					<p class="text-sm font-medium">Log out</p>
					<p class="text-xs text-muted-foreground">Sign out of your account on this device.</p>
				</div>
				<div>
					<Button variant="destructive" onclick={logout}>Log out</Button>
				</div>
			</div>
		</section>
	{/if}

	<section class="space-y-4">
		<h3 class="text-lg font-semibold">About</h3>
		<div class="flex flex-col gap-3 rounded-md border border-border p-4">
			<p class="text-sm text-muted-foreground">
				Web version: {__VERSION__ || 'v0.0.0'}
			</p>
		</div>

		{#if isTauri()}
			<div class="flex flex-col gap-3 rounded-md border border-border p-4">
				<p class="text-sm text-muted-foreground">
					APK version: {tauriVersion}
				</p>
			</div>
		{/if}

		<div class="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row">
			<Button
				variant="outline"
				class="w-full sm:w-40"
				onclick={() => window.open('https://github.com/Neo-Ciber94/etoshokan', '_blank')}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
					<path
						fill="currentColor"
						d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
					/>
				</svg>
				GitHub
			</Button>
			<Button
				variant="outline"
				class="w-full sm:w-40"
				onclick={() =>
					window.open('https://github.com/Neo-Ciber94/etoshokan/releases/latest', '_blank')}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					class="text-green-500"
				>
					<path
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172M7 7h.001"
					/>
				</svg>
				Latest Release
			</Button>
		</div>
	</section>
</div>
