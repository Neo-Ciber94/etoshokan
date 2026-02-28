<script lang="ts">
	import './layout.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import HandleAuthDeepLinking from './HandleAuthDeepLinking.svelte';

	let { children } = $props();

	const queryClient = new QueryClient();
</script>

<QueryClientProvider client={queryClient}>
	<HandleAuthDeepLinking />
	{@render children()}
</QueryClientProvider>
