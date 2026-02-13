<script lang="ts">
	import { dictionary } from '$lib/dictionary';
	import { Button } from '$lib/components/ui/button';

	const dict = dictionary;

	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	async function clearCache() {
		loading = true;
		error = '';
		success = '';
		try {
			await dict.clear();
			await dict.initialize();
			success = 'Cache cleared and dictionary reloaded successfully.';
		} catch (err) {
			console.error(err);
			error = (err && (err as any).message) || String(err);
		} finally {
			loading = false;
		}
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
		<h3 class="text-lg font-semibold">Dictionary</h3>
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
</div>
