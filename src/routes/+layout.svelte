<script lang="ts">
	import './layout.css';
	import { isTauri } from '$lib/utils/isWeb';
	import { handleAuthDeepLinking } from './handleAuthDeepLinking';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	let { children } = $props();

	$effect(() => {
		if (!isTauri()) {
			return;
		}

		let unlisten: (() => void) | undefined;

		async function run() {
			unlisten = await handleAuthDeepLinking();
		}

		run();
		return () => {
			unlisten?.();
		};
	});

	const queryClient = new QueryClient();
</script>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>
