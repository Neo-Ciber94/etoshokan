<script lang="ts">
	import { useSyncBookEntries } from '$lib/ebook/sync.svelte';
	import { badgeVariants } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload';
	import CloudOffIcon from '@lucide/svelte/icons/cloud-off';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { useBooksMetadata } from '$lib/ebook/books.svelte';
	import { uploadMissingBook } from '$lib/ebook/sync.mutation';
	import { openModal } from './modal';

	let { bookId, class: className = '' }: { bookId: string; class?: string } = $props();

	const sync = useSyncBookEntries();
	const books = useBooksMetadata();
	const entry = $derived(sync.value.find((x) => x.bookId === bookId));

	async function handleMissingBook() {
		const book = books.value.find((b) => b.id === bookId);

		if (book === null) {
			alert('Failed to find missing book locally');
			return;
		}

		if (confirm(`Book '${book?.title}' is missing on the cloud, Want to upload?`)) {
			const uploadMissingPromise = uploadMissingBook(bookId);
			openModal.pending(uploadMissingPromise, {
				title: 'Uploading book',
				onSuccess() {
					return {
						title: 'Book was uploaded'
					};
				},
				onError(error) {
					return {
						title: 'Failed to upload missing book',
						description: error instanceof Error ? error.message : 'Something went wrong'
					};
				}
			});

			await books.invalidate();
		}
	}
</script>

{#if entry?.uploadState === 'missing'}
	<button
		onclick={handleMissingBook}
		class={cn(badgeVariants({ variant: 'destructive' }), 'cursor-pointer', className)}
	>
		<CloudOffIcon />
		missing
	</button>
{:else if entry?.uploadState === 'pending'}
	<button
		onclick={() => alert('This book is pending to upload')}
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
		onclick={() => alert('This book is pending to sync progress')}
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
