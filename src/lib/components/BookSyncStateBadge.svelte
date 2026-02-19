<script lang="ts">
	import { useSyncBookEntries } from '$lib/ebook/sync.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload';
	import CloudOffIcon from '@lucide/svelte/icons/cloud-off';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	let { bookId, class: className = '' }: { bookId: string; class?: string } = $props();

	const sync = useSyncBookEntries();
	const entry = $derived(sync.value.find((x) => x.bookId === bookId));
</script>

{#if entry?.uploadState === 'missing'}
	<button
		onclick={() => console.log($state.snapshot(entry))}
		class={cn(badgeVariants({ variant: 'destructive' }), 'cursor-pointer', className)}
	>
		<CloudOffIcon />
		missing
	</button>
{:else if entry?.uploadState === 'pending'}
	<button
		onclick={() => console.log($state.snapshot(entry))}
		class={cn(
			badgeVariants(),
			'cursor-pointer border-transparent bg-amber-500 text-white',
			className
		)}
	>
		<CloudUploadIcon />
		pending
	</button>
{:else if entry?.syncState === 'pending'}
	<button
		onclick={() => console.log($state.snapshot(entry))}
		class={cn(
			badgeVariants(),
			'cursor-pointer border-transparent bg-amber-500 text-white',
			className
		)}
	>
		<RefreshCwIcon />
		unsynced
	</button>
{/if}
