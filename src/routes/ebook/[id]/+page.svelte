<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ePub, { type Book, type Rendition } from 'epubjs';
	import { Button } from '$lib/components/ui/button';
	import {
		getBook,
		getBooksMetadata,
		updateBookProgress,
		updateBookZoom
	} from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';
	import * as ContextMenu from '$lib/components/ui/context-menu';
	import { usePointer } from '$lib/runes/pointer.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LanguageIcon from '@lucide/svelte/icons/languages';
	import { debounce } from '$lib/runes/debounce.svelte';

	const pointer = usePointer();

	let bookId = $derived($page.params.id || '');
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let readerContainer: HTMLDivElement;
	let bookMetadata = $state<BookMetadata | null>(null);

	// Context menu state
	let contextMenuText = $state('');
	let contextMenuOpen = $state(false);

	// Zoom state
	let zoom = $state(100);
	let zoomControlsVisible = $state(false);
	let initialPinchDistance = 0;
	let initialPinchZoom = 0;
	const closeZoomControls = debounce(1000, () => {
		zoomControlsVisible = false;
	});

	$effect(() => {
		if (zoom > 0) {
			closeZoomControls();
		}
	});

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
					pointer.update((iframeRect?.left || 0) + e.clientX, (iframeRect?.top || 0) + e.clientY);
				});

				// Pinch zoom detection
				contents.document.documentElement.style.touchAction = 'pan-y';

				contents.document.addEventListener(
					'touchstart',
					(e: TouchEvent) => {
						if (e.touches.length === 2) {
							const dx = e.touches[0].clientX - e.touches[1].clientX;
							const dy = e.touches[0].clientY - e.touches[1].clientY;
							initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
							initialPinchZoom = zoom;
						}
					},
					{ passive: true }
				);

				contents.document.addEventListener(
					'touchmove',
					(e: TouchEvent) => {
						if (e.touches.length === 2 && initialPinchDistance > 0) {
							e.preventDefault();
							const dx = e.touches[0].clientX - e.touches[1].clientX;
							const dy = e.touches[0].clientY - e.touches[1].clientY;
							const distance = Math.sqrt(dx * dx + dy * dy);
							const scale = distance / initialPinchDistance;
							zoom = Math.min(200, Math.max(100, Math.round(initialPinchZoom * scale)));
						}
					},
					{ passive: false }
				);

				contents.document.addEventListener(
					'touchend',
					(e: TouchEvent) => {
						if (initialPinchDistance > 0 && e.touches.length < 2) {
							applyZoom(zoom);
							initialPinchDistance = 0;
						}
					},
					{ passive: true }
				);
			});

			// Restore reading position
			if (bookMetadata.currentCfi) {
				await rendition.display(bookMetadata.currentCfi);
			} else {
				await rendition.display();
			}

			// Restore zoom level
			if (bookMetadata.zoom && bookMetadata.zoom > 100) {
				zoom = bookMetadata.zoom;
				rendition.themes.fontSize(`${zoom}%`);
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

	// Zoom functions
	function applyZoom(newZoom: number) {
		zoom = Math.min(200, Math.max(100, Math.round(newZoom / 10) * 10));
		zoomControlsVisible = true;
		if (rendition) {
			rendition.themes.fontSize(`${zoom}%`);
		}
		updateBookZoom(bookId, zoom);
	}

	function handleZoomIn() {
		applyZoom(zoom + 1);
	}

	function handleZoomOut() {
		applyZoom(zoom - 1);
	}
</script>

<svelte:head>
	<title>Etoshokan - Reading{bookMetadata?.title ? ` - ${bookMetadata.title}` : ''}</title>
</svelte:head>

<!-- Book Reader -->
<section
	class="reader-container"
	oncontextmenu={(e) => e.preventDefault()}
	onpointerdown={() => {
		contextMenuOpen = false;
	}}
	role="application"
>
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
				<div class="mb-4 animate-pulse text-6xl">📖</div>
				<p class="text-sm text-muted-foreground">Loading book...</p>
			</div>
		</div>
	{:else if notFound}
		<div class="flex h-full items-center justify-center">
			<div class="space-y-4 text-center">
				<div class="mb-4 text-6xl">❌</div>
				<div class="space-y-2">
					<h3 class="text-lg font-semibold">Book Not Found</h3>
					<p class="max-w-md text-sm text-muted-foreground">
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
			<ContextMenu.Content class="min-w-40">
				<ContextMenu.Item
					onclick={handleTranslate}
					class="gap-3 px-3 py-2.5 text-base md:gap-2 md:px-2 md:py-1.5 md:text-sm"
				>
					<LanguageIcon class="size-5 md:size-4" />
					Translate
				</ContextMenu.Item>
				<ContextMenu.Item
					onclick={handleSearch}
					class="gap-3 px-3 py-2.5 text-base md:gap-2 md:px-2 md:py-1.5 md:text-sm"
				>
					<SearchIcon class="size-5 md:size-4" />
					Search
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Root>

		{#if zoomControlsVisible}
			<div class="zoom-controls">
				<button onclick={handleZoomIn} class="zoom-btn" disabled={zoom >= 200}>+</button>
				<span class="zoom-level">{zoom}%</span>
				<button onclick={handleZoomOut} class="zoom-btn">&minus;</button>
			</div>
		{/if}
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
		touch-action: pan-y;
		-webkit-overflow-scrolling: touch;
	}

	:global(.reader-content iframe) {
		touch-action: pan-y;
	}

	.zoom-controls {
		position: fixed;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		background: hsl(var(--card) / 0.9);
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		padding: 0.5rem;
		z-index: 50;
		backdrop-filter: blur(4px);
	}

	.zoom-btn {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 150ms;
	}

	.zoom-btn:hover {
		background: hsl(var(--accent));
	}

	.zoom-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.zoom-level {
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		font-variant-numeric: tabular-nums;
	}
</style>
