<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import WifiOffIcon from '@lucide/svelte/icons/wifi-off';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let isOnline = $state(false);

	$effect(() => {
		isOnline = navigator.onLine;

		function handleOnline() {
			isOnline = true;
			goto('/');
		}

		function handleOffline() {
			isOnline = false;
		}

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		};
	});

	function retry() {
		if (navigator.onLine) {
			goto('/');
		} else {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>Offline - Etoshokan</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
	<div class="rounded-full bg-muted p-6">
		<WifiOffIcon class="size-12 text-muted-foreground" />
	</div>

	<div class="space-y-2">
		<h1 class="text-2xl font-bold">You're offline</h1>
		<p class="max-w-sm text-sm text-muted-foreground">
			It looks like you've lost your internet connection. Some features may be unavailable until
			you're back online.
		</p>
	</div>

	{#if isOnline}
		<p class="text-sm font-medium text-green-600 dark:text-green-400">
			Connection restored! Redirecting...
		</p>
	{:else}
		<Button onclick={retry} variant="outline" class="gap-2">
			<RefreshCwIcon class="size-4" />
			Try again
		</Button>
	{/if}
</div>
