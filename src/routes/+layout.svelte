<script lang="ts">
	import './layout.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import HandleAuthDeepLinking from './HandleAuthDeepLinking.svelte';
	import { QUERY_CLIENT } from './query';

	let { children } = $props();
</script>

<QueryClientProvider client={QUERY_CLIENT}>
	<HandleAuthDeepLinking />
	{@render children()}
</QueryClientProvider>
