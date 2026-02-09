<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ePub, { type Book, type Rendition } from 'epubjs';
	import { Button } from '$lib/components/ui/button';
	import { getBook, getBooksMetadata, updateBookProgress } from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';
	import { dictionary } from '$lib/dictionary';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import DictionaryPopup from '$lib/components/DictionaryPopup.svelte';

	let bookId = $derived($page.params.id || "");
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let readerContainer: HTMLDivElement;
	let bookMetadata = $state<BookMetadata | null>(null);

	// Dictionary popup state
	let dictionaryEntries = $state<WordEntry[]>([]);
	let selectedWord = $state<string>('');
	let popupPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
	let showDictionary = $state(false);

	// Swipe detection
	let touchStartX = 0;
	let touchStartY = 0;
	let touchEndX = 0;
	let touchEndY = 0;

	// Initialize dictionary on mount
	onMount(async () => {
		dictionary.initialize().catch((err) => {
			console.error('Failed to initialize dictionary:', err);
		});

		await loadBook();
	});

	// Toggle reading mode class on body
	$effect(() => {
		document.body.classList.add('reading-mode');

		return () => {
			document.body.classList.remove('reading-mode');
			if (rendition) {
				rendition.destroy();
			}
			if (readerContainer) {
				readerContainer.removeEventListener('touchstart', handleTouchStart);
				readerContainer.removeEventListener('touchmove', handleTouchMove);
				readerContainer.removeEventListener('touchend', handleTouchEnd);
			}
		};
	});

	async function loadBook() {
		loading = true;
		notFound = false;

		try {
			// Get book metadata
			const books = await getBooksMetadata();
			bookMetadata = books.find((b) => b.id === bookId) || null;

			if (!bookMetadata) {
				console.error('Book not found');
				notFound = true;
				loading = false;
				return;
			}

			const bookData = await getBook(bookId);
			if (!bookData) {
				console.error('Book data not found');
				notFound = true;
				loading = false;
				return;
			}

			currentBook = ePub(bookData);
			rendition = currentBook.renderTo(readerContainer, {
				width: '100%',
				height: '100%',
				spread: 'none'
			});

			// Apply custom styles for light/dark mode
			const isDark = document.documentElement.classList.contains('dark');
			rendition.themes.default({
				body: {
					color: isDark ? '#f1f5f9 !important' : '#0f172a !important',
					background: isDark ? '#0f172a !important' : '#ffffff !important'
				},
				'p, div, span, h1, h2, h3, h4, h5, h6': {
					color: isDark ? '#f1f5f9 !important' : '#0f172a !important'
				},
				a: {
					color: isDark ? '#60a5fa !important' : '#3b82f6 !important'
				}
			});

			// Restore reading position
			if (bookMetadata.currentCfi) {
				await rendition.display(bookMetadata.currentCfi);
			} else {
				await rendition.display();
			}

			// Track reading progress
			rendition.on('relocated', async (location: any) => {
				const progress = Math.round((location.start.percentage || 0) * 100);
				await updateBookProgress(bookId, location.start.cfi, progress);

				// Update local metadata
				if (bookMetadata) {
					bookMetadata.currentCfi = location.start.cfi;
					bookMetadata.progress = progress;
					bookMetadata.lastReadAt = Date.now();
				}
			});

			// Track text selection and lookup in dictionary
			rendition.on('selected', async (cfiRange: string, contents: any) => {
				const selection = contents.window.getSelection();
				if (selection && selection.toString()) {
					const selectedText = selection.toString().trim();
					console.log('Selected text:', selectedText);

					// Look up word in dictionary
					try {
						const entries = await dictionary.lookup(selectedText);
						console.log(entries);

						if (entries.length > 0) {
							selectedWord = selectedText;
							dictionaryEntries = entries;

							// Get selection position
							const range = selection.getRangeAt(0);
							const rect = range.getBoundingClientRect();

							// Position popup below the selection
							popupPosition = {
								x: Math.min(rect.left, window.innerWidth - 400),
								y: rect.bottom + 8
							};

							showDictionary = true;
						}
					} catch (error) {
						console.error('Dictionary lookup error:', error);
					}
				}
			});

			// Add swipe gesture support
			readerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
			readerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
			readerContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
		} catch (error) {
			console.error('Error loading book:', error);
			notFound = true;
		} finally {
			loading = false;
		}
	}

	function closeBook() {
		goto('/ebook');
	}

	function closeDictionary() {
		showDictionary = false;
		dictionaryEntries = [];
		selectedWord = '';
	}

	function nextPage() {
		rendition?.next();
	}

	function prevPage() {
		rendition?.prev();
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

<!-- Book Reader -->
<section class="reader-container">
	<div class="reader-controls">
		<Button onclick={closeBook} variant="outline" size="sm">← Back</Button>
		<div class="truncate text-sm text-muted-foreground">
			{bookMetadata?.title || 'Loading...'}
		</div>
		<div class="flex gap-2">
			<Button onclick={prevPage} variant="outline" size="sm" disabled={!rendition || loading}>
				← Prev
			</Button>
			<Button onclick={nextPage} variant="outline" size="sm" disabled={!rendition || loading}>
				Next →
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<div class="text-6xl animate-pulse mb-4">📖</div>
				<p class="text-sm text-muted-foreground">Loading book...</p>
			</div>
		</div>
	{:else if notFound}
		<div class="flex h-full items-center justify-center">
			<div class="text-center space-y-4">
				<div class="text-6xl mb-4">❌</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold">Book Not Found</h3>
					<p class="text-sm text-muted-foreground max-w-md">
						The book you're looking for doesn't exist or may have been deleted.
					</p>
				</div>
				<Button onclick={closeBook}>Back to Library</Button>
			</div>
		</div>
	{:else}
		<div bind:this={readerContainer} class="reader-content"></div>
	{/if}
</section>

<!-- Dictionary Popup -->
{#if showDictionary}
	<DictionaryPopup
		word={selectedWord}
		entries={dictionaryEntries}
		position={popupPosition}
		onClose={closeDictionary}
	/>
{/if}

<style>
	.reader-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		background: hsl(var(--background));
	}

	.reader-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid hsl(var(--border));
		background: hsl(var(--card));
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
