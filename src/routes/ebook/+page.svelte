<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ePub from 'epubjs';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { saveBook, getBooksMetadata, deleteBook } from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';

	let books = $state<BookMetadata[]>([]);
	let loading = $state(true);
	let uploadingBook = $state(false);

	onMount(async () => {
		// TODO: Handle error
		loading = true;
		books = await getBooksMetadata();
		loading = false;
	});

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploadingBook = true;
		try {
			const arrayBuffer = await file.arrayBuffer();
			const book = ePub(arrayBuffer);

			// Load metadata
			await book.ready;
			const metadata = await book.loaded.metadata;

			// Get cover as a blob and convert to data URL
			let coverDataUrl: string | undefined;
			try {
				const coverUrl = await book.coverUrl();
				if (coverUrl) {
					// Fetch the blob URL and convert to data URL
					const response = await fetch(coverUrl);
					const blob = await response.blob();
					coverDataUrl = await blobToDataURL(blob);
				}
			} catch (error) {
				// TODO: Show actual error, or use placeholder
				console.error('Error loading cover:', error);
			}

			const bookId = crypto.randomUUID();
			const bookMetadata: BookMetadata = {
				id: bookId,
				title: metadata.title || 'Unknown Title',
				author: metadata.creator || 'Unknown Author',
				cover: coverDataUrl,
				addedAt: Date.now()
			};

			await saveBook({
				metadata: bookMetadata,
				file: arrayBuffer
			});

			books = await getBooksMetadata();
		} catch (error) {
			console.error('Error uploading book:', error);
		} finally {
			uploadingBook = false;
			input.value = '';
		}
	}

	async function blobToDataURL(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	async function handleDeleteBook(id: string) {
		if (!confirm('Are you sure you want to delete this book?')) return;

		await deleteBook(id);
		books = await getBooksMetadata();
	}

	function openBook(id: string) {
		goto(`/ebook/${id}`);
	}
</script>

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
					{uploadingBook ? 'Uploading...' : 'Upload Book'}
				</Button>
			</div>
		</div>

		{#if loading}
			<Card.Root class="border border-border">
				<Card.Content class="p-8">
					<div class="flex flex-col items-center justify-center space-y-4 text-center">
						<div class="text-6xl animate-pulse">📚</div>
						<div class="space-y-2">
							<h3 class="text-lg font-semibold text-foreground">Loading books...</h3>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if books.length === 0}
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
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each books as book (book.id)}
					<Card.Root class="border border-border transition-colors hover:border-primary/50">
						<Card.Content class="p-4">
							<div class="flex flex-col space-y-3">
								{#if book.cover}
									<img
										src={book.cover}
										alt={book.title}
										class="h-48 w-full rounded object-cover"
									/>
								{:else}
									<div
										class="flex h-48 w-full items-center justify-center rounded bg-muted"
									>
										<span class="text-4xl">📖</span>
									</div>
								{/if}
								<div class="flex-1 space-y-1">
									<h3 class="line-clamp-2 text-sm font-semibold">{book.title}</h3>
									<p class="line-clamp-1 text-xs text-muted-foreground">
										{book.author}
									</p>
									{#if book.progress}
										<div class="pt-2">
											<div
												class="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
											>
												<div
													class="h-full bg-primary transition-all"
													style="width: {book.progress}%"
												></div>
											</div>
											<p class="mt-1 text-xs text-muted-foreground">
												{book.progress}% complete
											</p>
										</div>
									{/if}
								</div>
								<div class="flex gap-2">
									<Button onclick={() => openBook(book.id)} class="flex-1" size="sm">
										{book.progress ? 'Continue' : 'Read'}
									</Button>
									<Button
										onclick={() => handleDeleteBook(book.id)}
										variant="destructive"
										size="sm"
									>
										Delete
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</section>
</div>
