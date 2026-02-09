<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ePub, { type Book, type Rendition } from 'epubjs';
	import { Button } from '$lib/components/ui/button';
	import { getBook, getBooksMetadata, updateBookProgress } from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { usePointer } from '$lib/runes/pointer.svelte';

	const pointer = usePointer();

	let bookId = $derived($page.params.id || "");
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let readerContainer: HTMLDivElement;
	let bookMetadata = $state<BookMetadata | null>(null);

	// Context menu state
	let contextMenuText = $state('');
	let contextMenuOpen = $state(false);

	// Swipe detection
	let touchStartX = 0;
	let touchStartY = 0;
	let touchEndX = 0;
	let touchEndY = 0;

	onMount(async () => {
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

			// Load the book but don't render yet
			currentBook = ePub(bookData);

			// Stop loading to render the container
			loading = false;

			// Wait for next tick to ensure container is in DOM
			await tick();

			// Check if container exists before rendering
			if (!readerContainer) {
				console.error('Reader container not found');
				notFound = true;
				return;
			}

			rendition = currentBook.renderTo(readerContainer, {
				width: '100%',
				height: '100%',
				spread: 'none'
			});

			// Apply custom styles for light/dark mode
			const isDark = document.documentElement.classList.contains('dark');
			rendition.themes.default({
				body: {
					color: isDark ? '#f1f5f9 !important' : 'var(--background) !important',
					background: isDark ? 'var(--background) !important' : '#ffffff !important'
				},
				'p, div, span, h1, h2, h3, h4, h5, h6': {
					color: isDark ? '#f1f5f9 !important' : 'var(--background) !important'
				},
				a: {
					color: isDark ? '#60a5fa !important' : '#3b82f6 !important'
				}
			});

			// Register content hooks before display so they fire for the initial page
			rendition.hooks.content.register((contents: any) => {
				contents.document.addEventListener('contextmenu', (e: Event) => {
					e.preventDefault();
				});
				contents.document.addEventListener('pointermove', (e: PointerEvent) => {
					const iframe = readerContainer.querySelector('iframe');
					const iframeRect = iframe?.getBoundingClientRect();
					pointer.update(
						(iframeRect?.left || 0) + e.clientX,
						(iframeRect?.top || 0) + e.clientY
					);
				});
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

			// Track text selection and show context menu
			rendition.on('selected', async (cfiRange: string, contents: any) => {
				const selection = contents.window.getSelection();
				if (selection && selection.toString()) {
					const selectedText = selection.toString().trim();
					if (!selectedText) return;

					contextMenuText = selectedText;

					readerContainer.dispatchEvent(
						new PointerEvent('contextmenu', {
							bubbles: true,
							clientX: pointer.x,
							clientY: pointer.y
						})
					);
				}
			});

			// Close context menu when clicking inside iframe
			rendition.on('click', () => {
				contextMenuOpen = false;
			});

			// Add swipe gesture support
			readerContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
			readerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
			readerContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
		} catch (error) {
			console.error('Error loading book:', error);
			notFound = true;
			loading = false;
		}
	}

	function closeBook() {
		goto('/ebook');
	}

	function handleTranslate() {
		console.log(contextMenuText);
	}

	function handleSearch() {
		window.open(`https://jisho.org/search/${encodeURIComponent(contextMenuText)}`, '_blank');
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
<section class="reader-container" oncontextmenu={(e) => e.preventDefault()} onpointerdown={() => { contextMenuOpen = false; }} role="application">
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
		<ContextMenu.Root bind:open={contextMenuOpen}>
			<ContextMenu.Trigger class="reader-content">
				<div bind:this={readerContainer} class="h-full w-full"></div>
			</ContextMenu.Trigger>
			<ContextMenu.Content>
				<ContextMenu.Item onclick={handleTranslate}>Translate</ContextMenu.Item>
				<ContextMenu.Item onclick={handleSearch}>Search</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>
	{/if}
</section>

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

	:global(.reader-content) {
		flex: 1;
		overflow: auto;
		position: relative;
		touch-action: pan-y pinch-zoom;
		-webkit-overflow-scrolling: touch;
	}

	:global(.reader-content iframe) {
		touch-action: pan-y pinch-zoom;
	}
</style>
