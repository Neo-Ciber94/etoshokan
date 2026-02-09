<script lang="ts">
	import { onMount } from 'svelte';
	import ePub, { type Book, type Rendition } from 'epubjs';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { saveBook, getBook, getBooksMetadata, updateBookProgress, deleteBook } from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';

	let books = $state<BookMetadata[]>([]);
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let selectedBookId = $state<string | null>(null);
	let loading = $state(false);
	let readerContainer: HTMLDivElement;

	// Swipe detection
	let touchStartX = 0;
	let touchStartY = 0;
	let touchEndX = 0;
	let touchEndY = 0;

	// Load books on mount
	onMount(async () => {
		books = await getBooksMetadata();
	});

	// Toggle reading mode class on body
	$effect(() => {
		if (selectedBookId) {
			document.body.classList.add('reading-mode');
		} else {
			document.body.classList.remove('reading-mode');
		}

		// Cleanup on unmount
		return () => {
			document.body.classList.remove('reading-mode');
		};
	});

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		loading = true;
		try {
			const arrayBuffer = await file.arrayBuffer();
			const book = ePub(arrayBuffer);

			// Load metadata
			await book.ready;
			const metadata = await book.loaded.metadata;
			const cover = await book.coverUrl();

			const bookId = crypto.randomUUID();
			const bookMetadata: BookMetadata = {
				id: bookId,
				title: metadata.title || 'Unknown Title',
				author: metadata.creator || 'Unknown Author',
				cover: cover || undefined,
				addedAt: Date.now(),
			};

			await saveBook({
				metadata: bookMetadata,
				file: arrayBuffer,
			});

			books = await getBooksMetadata();
		} catch (error) {
			console.error('Error uploading book:', error);
		} finally {
			loading = false;
			input.value = '';
		}
	}

	async function openBook(id: string) {
		loading = true;
		selectedBookId = id;

		try {
			// Clean up previous book
			if (rendition) {
				rendition.destroy();
			}

			const bookData = await getBook(id);
			if (!bookData) return;

			currentBook = ePub(bookData);
			rendition = currentBook.renderTo(readerContainer, {
				width: '100%',
				height: '100%',
				spread: 'none',
			});

			// Apply custom styles for light/dark mode
			const isDark = document.documentElement.classList.contains('dark');
			rendition.themes.default({
				body: {
					color: isDark ? '#f1f5f9 !important' : '#0f172a !important',
					background: isDark ? '#0f172a !important' : '#ffffff !important',
				},
				'p, div, span, h1, h2, h3, h4, h5, h6': {
					color: isDark ? '#f1f5f9 !important' : '#0f172a !important',
				},
				a: {
					color: isDark ? '#60a5fa !important' : '#3b82f6 !important',
				}
			});

			// Get book metadata to restore position
			const metadata = books.find((b) => b.id === id);
			if (metadata?.currentCfi) {
				await rendition.display(metadata.currentCfi);
			} else {
				await rendition.display();
			}

			// Track reading progress
			rendition.on('relocated', async (location: any) => {
				const progress = Math.round((location.start.percentage || 0) * 100);
				await updateBookProgress(id, location.start.cfi, progress);

				// Update local metadata
				const bookMeta = books.find((b) => b.id === id);
				if (bookMeta) {
					bookMeta.currentCfi = location.start.cfi;
					bookMeta.progress = progress;
					bookMeta.lastReadAt = Date.now();
				}
			});

			// Track text selection
			rendition.on('selected', (cfiRange: string, contents: any) => {
				const selection = contents.window.getSelection();
				if (selection && selection.toString()) {
					const selectedText = selection.toString().trim();
					console.log('Selected text:', selectedText);
				}
			});

			// Add swipe gesture support
			readerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
			readerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
			readerContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
		} catch (error) {
			console.error('Error opening book:', error);
		} finally {
			loading = false;
		}
	}

	function closeBook() {
		if (rendition) {
			rendition.destroy();
		}

		// Remove swipe event listeners
		if (readerContainer) {
			readerContainer.removeEventListener('touchstart', handleTouchStart);
			readerContainer.removeEventListener('touchmove', handleTouchMove);
			readerContainer.removeEventListener('touchend', handleTouchEnd);
		}

		currentBook = null;
		rendition = null;
		selectedBookId = null;
	}

	function nextPage() {
		rendition?.next();
	}

	function prevPage() {
		rendition?.prev();
	}

	async function handleDeleteBook(id: string) {
		if (!confirm('Are you sure you want to delete this book?')) return;

		if (selectedBookId === id) {
			closeBook();
		}

		await deleteBook(id);
		books = await getBooksMetadata();
	}

	// Swipe gesture handlers
	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
		touchStartY = e.changedTouches[0].screenY;
	}

	function handleTouchMove(e: TouchEvent) {
		// Prevent default behavior to stop browser navigation
		const touch = e.changedTouches[0];
		const deltaX = Math.abs(touch.screenX - touchStartX);
		const deltaY = Math.abs(touch.screenY - touchStartY);

		// If horizontal swipe is greater than vertical, prevent default
		if (deltaX > deltaY) {
			e.preventDefault();
		}
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		touchEndY = e.changedTouches[0].screenY;
		handleSwipe();
	}

	function handleSwipe() {
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;
		const minSwipeDistance = 50;

		// Only trigger if horizontal swipe is greater than vertical
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
			if (deltaX > 0) {
				// Swipe right - previous page
				prevPage();
			} else {
				// Swipe left - next page
				nextPage();
			}
		}
	}
</script>

<div class="space-y-8">
	{#if !selectedBookId}
		<!-- Book Library -->
		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="space-y-2">
					<h2 class="text-xl font-semibold">Book Library</h2>
					<p class="text-sm text-slate-600 dark:text-slate-400">
						Upload and read EPUB files
					</p>
				</div>
				<div>
					<input
						type="file"
						accept=".epub"
						onchange={handleFileUpload}
						class="hidden"
						id="book-upload"
					/>
					<Button onclick={() => document.getElementById('book-upload')?.click()} disabled={loading}>
						{loading ? 'Uploading...' : 'Upload Book'}
					</Button>
				</div>
			</div>

			{#if books.length === 0}
				<Card.Root class="border border-slate-200 dark:border-slate-800">
					<Card.Content class="p-8">
						<div class="flex flex-col items-center justify-center space-y-4 text-center">
							<div class="text-6xl">📚</div>
							<div class="space-y-2">
								<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">
									No books yet
								</h3>
								<p class="text-sm text-slate-600 dark:text-slate-400 max-w-md">
									Upload your first EPUB file to start reading
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each books as book (book.id)}
						<Card.Root class="border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
							<Card.Content class="p-4">
								<div class="flex flex-col space-y-3">
									{#if book.cover}
										<img
											src={book.cover}
											alt={book.title}
											class="h-48 w-full object-cover rounded"
										/>
									{:else}
										<div class="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
											<span class="text-4xl">📖</span>
										</div>
									{/if}
									<div class="space-y-1 flex-1">
										<h3 class="font-semibold text-sm line-clamp-2">{book.title}</h3>
										<p class="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
											{book.author}
										</p>
										{#if book.progress}
											<div class="pt-2">
												<div class="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
													<div
														class="h-full bg-slate-900 dark:bg-slate-50 transition-all"
														style="width: {book.progress}%"
													></div>
												</div>
												<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
													{book.progress}% complete
												</p>
											</div>
										{/if}
									</div>
									<div class="flex gap-2">
										<Button
											onclick={() => openBook(book.id)}
											class="flex-1"
											size="sm"
										>
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
	{:else}
		<!-- Book Reader -->
		<section class="reader-container">
			<div class="reader-controls">
				<Button onclick={closeBook} variant="outline" size="sm">
					← Back
				</Button>
				<div class="text-sm text-slate-600 dark:text-slate-400 truncate">
					{books.find(b => b.id === selectedBookId)?.title || 'Reading...'}
				</div>
				<div class="flex gap-2">
					<Button onclick={prevPage} variant="outline" size="sm" disabled={!rendition}>
						← Prev
					</Button>
					<Button onclick={nextPage} variant="outline" size="sm" disabled={!rendition}>
						Next →
					</Button>
				</div>
			</div>

			<div
				bind:this={readerContainer}
				class="reader-content"
			></div>
		</section>
	{/if}
</div>

<style>
	.reader-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		background: white;
	}

	:global(.dark) .reader-container {
		background: #0f172a;
	}

	.reader-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgb(226 232 240);
		background: white;
	}

	:global(.dark) .reader-controls {
		border-bottom-color: rgb(30 41 59);
		background: #1e293b;
	}

	.reader-content {
		flex: 1;
		overflow: auto;
		position: relative;
		touch-action: pan-y pinch-zoom;
		-webkit-overflow-scrolling: touch;
	}

	/* Improve touch experience */
	.reader-content :global(iframe) {
		touch-action: pan-y pinch-zoom;
	}
</style>
