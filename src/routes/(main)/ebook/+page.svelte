<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		deleteLocalBook,
		uploadBookFromFile,
		UploadResultStatus,
		type UploadResult
	} from '$lib/data/ebook/books.mutation';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { useBooksMetadata } from '$lib/data/ebook/books.svelte';
	import { openModal } from '$lib/components/modal';
	import Loading from '$lib/components/Loading.svelte';
	import BookSyncStateBadge from '$lib/components/BookSyncStateBadge.svelte';
	import { cn } from '$lib/utils';
	import { tick } from 'svelte';

	const books = useBooksMetadata();
	let uploadingBook = $state(false);

	function onUploadResult(uploadResult: UploadResult) {
		switch (uploadResult.status) {
			case UploadResultStatus.RemoteFailedUploadedLocally:
				alert('Failed to upload book remotely, but was saved locally');
				break;
		}
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			console.warn('No book to upload');
			return;
		}

		uploadingBook = true;

		try {
			const uploadBookPromise = uploadBookFromFile(file);
			await openModal.pending(uploadBookPromise, {
				title: 'Uploading book',
				onSuccess(result) {
					tick().then(() => onUploadResult(result));

					return {
						title: 'Book uploaded'
					};
				},
				onError(err) {
					return {
						title: 'Failed to upload book',
						description: err instanceof Error ? err.message : 'Something went wrong'
					};
				}
			});
			books.invalidate();
		} catch (err) {
			console.error(err);
		} finally {
			uploadingBook = false;
			input.value = '';
		}
	}

	async function handleDeleteBook(id: string) {
		if (!confirm('Are you sure you want to delete this book?')) {
			return;
		}

		try {
			await deleteLocalBook(id);
			books.invalidate();
		} catch (err) {
			console.error(err);
			openModal({
				title: 'Something went wrong',
				description: 'Failed to delete book',
				type: 'error'
			});
		}
	}

	function openBook(id: string) {
		goto(`/ebook/${id}`);
	}
</script>

<svelte:head>
	<title>Etoshokan - EBook</title>
</svelte:head>

<div class="space-y-8">
	<!-- Book Library -->
	<section class="space-y-4">
		<div class="flex items-center justify-between">
			<div class="space-y-2">
				<h2 class="text-xl font-semibold">Book Library</h2>
				<p class="text-sm text-muted-foreground">Upload and read EPUB files</p>
			</div>
			<div>
				<input
					type="file"
					accept=".epub"
					onchange={handleFileUpload}
					class="hidden"
					id="book-upload"
				/>
				<Button
					onclick={() => document.getElementById('book-upload')?.click()}
					disabled={uploadingBook}
				>
					{#if uploadingBook}
						<Loading class="size-5" />
					{/if}
					<span>Upload Book</span>
				</Button>
			</div>
		</div>

		{#if books.loading}
			<Card.Root class="border border-border">
				<Card.Content class="p-8">
					<div class="flex flex-col items-center justify-center space-y-4 text-center">
						<div class="animate-pulse text-6xl">📚</div>
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-foreground">Loading books...</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if books.value.length === 0}
			<Card.Root class="border border-border">
				<Card.Content class="p-8">
					<div class="flex flex-col items-center justify-center space-y-4 text-center">
						<div class="text-6xl">📚</div>
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-foreground">No books yet</h3>
							<p class="max-w-md text-sm text-muted-foreground">
								Upload your first EPUB file to start reading
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
				{#each books.value as book (book.id)}
					<Card.Root
						class="relative border border-border transition-colors hover:border-primary/50"
					>
						<BookSyncStateBadge
							bookId={book.id}
							class="absolute top-2 right-2 sm:top-4 sm:right-4"
						/>

						<Card.Content class="mt-2 p-2 sm:mt-3 sm:p-4">
							<div class="flex flex-col space-y-2 sm:space-y-3">
								{#if book.cover}
									<img
										src={book.cover}
										alt={book.title}
										class="h-32 w-full rounded object-cover sm:h-48"
									/>
								{:else}
									<div
										class="flex h-32 w-full items-center justify-center rounded bg-muted sm:h-48"
									>
										<span class="text-2xl sm:text-4xl">📖</span>
									</div>
								{/if}
								<div class="flex-1 space-y-1">
									<h3 class="line-clamp-2 text-xs font-semibold sm:text-sm">{book.title}</h3>
									<p class="line-clamp-1 text-xs text-muted-foreground">
										{book.author}
									</p>
									<div class={cn('pt-1 sm:pt-2', !book.progress && 'invisible')}>
										<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
											<div
												class="h-full bg-primary transition-all"
												style="width: {book.progress}%"
											></div>
										</div>
										<p class="mt-1 text-xs text-muted-foreground">
											{book.progress}% complete
										</p>
									</div>
								</div>
								<div class="flex gap-1 sm:gap-2">
									<Button onclick={() => openBook(book.id)} class="flex-1" size="sm">
										{book.progress ? 'Continue' : 'Read'}
									</Button>
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="outline" size="sm">
													<EllipsisVerticalIcon class="size-4" />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Item
												class="text-destructive"
												onclick={() => handleDeleteBook(book.id)}
											>
												<TrashIcon class="size-4" />
												Delete
											</DropdownMenu.Item>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</section>
</div>
