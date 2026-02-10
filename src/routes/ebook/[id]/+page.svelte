<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
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
	import * as Drawer from '$lib/components/ui/drawer';
	import { usePointer } from '$lib/runes/pointer.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LanguageIcon from '@lucide/svelte/icons/languages';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { debounce } from '$lib/runes/debounce.svelte';
	import TranslationBox from '$lib/components/TranslationBox.svelte';
	import { dictionary } from '$lib/dictionary';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';

	const pointer = usePointer();

	let bookId = $derived(page.params.id || '');
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let readerContainer: HTMLDivElement;
	let bookMetadata = $state<BookMetadata | null>(null);
	let isOnTextSelection = $state(false);
	let lastTextSelection = $state('');

	// Context menu state
	let contextMenuText = $state('');
	let contextMenuOpen = $state(false);

	// Zoom state
	let zoom = $state(100);

	// Drawer state
	let drawerOpen = $state(false);

	// Translation state
	let showTranslation = $state(false);
	let translationEntries = $state<WordEntry[]>([]);
	let translationLoading = $state(false);

	// Search on selection
	let searchOnSelection = $state(true);

	// Selection time (debounce delay in ms)
	let selectionTime = $state(100);

	// Page indicator state
	let showPageIndicator = $state(false);
	let currentPage = $state(0);
	let totalPages = $state(0);

	// Pointer tracking for fast-click detection
	let pagePointer = $state({
		pointerDownX: 0,
		pointerDownY: 0,
		pointerDownTime: 0
	});

	// Debounced context menu trigger on pointer up
	const showContextMenuIfSelection = debounce(
		() => selectionTime,
		(contents: any) => {
			const selection = contents.window.getSelection();
			if (selection && selection.toString().trim()) {
				contextMenuText = selection.toString().trim();
				isOnTextSelection = true;
				readerContainer.dispatchEvent(
					new PointerEvent('contextmenu', {
						bubbles: true,
						clientX: pointer.x,
						clientY: pointer.y
					})
				);
			}
		}
	);

	$effect(() => {
		console.log({ lastTextSelection });
		if (lastTextSelection == '') {
			contextMenuOpen = false;
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
				// contents.document.addEventListener('contextmenu', (e: Event) => {
				// 	e.preventDefault();
				// });
				contents.document.addEventListener('pointermove', (e: PointerEvent) => {
					const iframe = readerContainer.querySelector('iframe');
					const iframeRect = iframe?.getBoundingClientRect();
					pointer.update((iframeRect?.left || 0) + e.clientX, (iframeRect?.top || 0) + e.clientY);
				});

				contents.document.addEventListener('pointerdown', (e: PointerEvent) => {
					pagePointer.pointerDownX = e.clientX;
					pagePointer.pointerDownY = e.clientY;
					pagePointer.pointerDownTime = Date.now();
				});

				contents.document.addEventListener('pointerup', (e: PointerEvent) => {
					// Check for text selection and show context menu (debounced)
					if (!searchOnSelection) {
						showContextMenuIfSelection(contents);
					}

					// Fast-click toggle for page indicator
					const dx = e.clientX - pagePointer.pointerDownX;
					const dy = e.clientY - pagePointer.pointerDownY;
					const distance = Math.sqrt(dx * dx + dy * dy);
					const duration = Date.now() - pagePointer.pointerDownTime;
					const selection = contents.window.getSelection();
					const hasSelection = selection && selection.toString().trim().length > 0;

					if (distance <= 10 && duration <= 500 && !hasSelection && !isOnTextSelection) {
						contextMenuOpen = false;
						showPageIndicator = !showPageIndicator;
						console.log('Show page indicator: ' + showPageIndicator);
					}
				});

				contents.document.documentElement.style.touchAction = 'pan-y';
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

			// Track reading progress and page numbers
			rendition.on('relocated', async (location: any) => {
				const progress = Math.round((location.start.percentage || 0) * 100);
				await updateBookProgress(bookId, location.start.cfi, progress);

				// Update local metadata
				if (bookMetadata) {
					bookMetadata.currentCfi = location.start.cfi;
					bookMetadata.progress = progress;
					bookMetadata.lastReadAt = Date.now();
				}

				// Update page numbers
				if (location.start.displayed) {
					currentPage = location.start.displayed.page;
					totalPages = location.start.displayed.total;
				}
			});

			// Track text selection and show context menu
			rendition.on('selected', async (cfiRange: string, contents: any) => {
				const selection = contents.window.getSelection();
				lastTextSelection = selection == null ? '' : selection.toString().trim();

				if (selection && selection.toString()) {
					const selectedText = selection.toString().trim();
					if (!selectedText) {
						return;
					}

					contextMenuText = selectedText;

					if (searchOnSelection) {
						showContextMenuIfSelection(contents);
					}
				}
			});

			// Toggle page indicator on click inside iframe
			rendition.on('click', async () => {
				await tick();
				if (!contextMenuOpen) {
					isOnTextSelection = false;
				}
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

	async function handleTranslate() {
		showTranslation = true;
		translationLoading = true;
		translationEntries = [];

		try {
			await dictionary.initialize();
			translationEntries = await dictionary.lookup(contextMenuText.trim(), {
				targetLanguage: 'en'
			});
		} catch {
			translationEntries = [];
		} finally {
			translationLoading = false;
		}
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
		if (rendition) {
			rendition.themes.fontSize(`${zoom}%`);
		}
		updateBookZoom(bookId, zoom);
	}

	function handleZoomIn() {
		applyZoom(zoom + 10);
	}

	function handleZoomOut() {
		applyZoom(zoom - 10);
	}
</script>

<svelte:head>
	<title>Etoshokan - Reading{bookMetadata?.title ? ` - ${bookMetadata.title}` : ''}</title>
</svelte:head>

	<!-- onpointerdown={() => {
		contextMenuOpen = false;
	}}
	oncontextmenu={(e) => e.preventDefault()} -->

<section
	class="reader-container"

	role="application"
>
	<div class="reader-controls">
		<Button onclick={closeBook} variant="outline" size="sm">← Back</Button>
		<div class="truncate text-sm text-muted-foreground">
			{bookMetadata?.title || 'Loading...'}
		</div>
		<div class="flex items-center gap-2">
			<Button onclick={() => (drawerOpen = true)} variant="ghost" size="icon-sm">
				<SettingsIcon class="size-4" />
			</Button>
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

		<!-- Page indicator -->
		{#if showPageIndicator && totalPages > 0}
			<div class="page-indicator">
				{currentPage} / {totalPages}
			</div>
		{/if}
	{/if}
</section>

<!-- Translation box -->
{#if showTranslation}
	<TranslationBox
		selectedText={contextMenuText}
		entries={translationEntries}
		loading={translationLoading}
		onClose={() => (showTranslation = false)}
	/>
{/if}

<!-- Options Drawer -->
<Drawer.Root bind:open={drawerOpen} direction="bottom">
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>Options</Drawer.Title>
		</Drawer.Header>
		<div class="flex flex-col gap-6 px-4 pb-6">
			<!-- Zoom control -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Zoom</span>
				<div class="flex items-center gap-3">
					<Button onclick={handleZoomOut} variant="outline" size="icon-sm" disabled={zoom <= 100}>
						<MinusIcon class="size-4" />
					</Button>
					<span class="w-12 text-center text-sm tabular-nums">{zoom}%</span>
					<Button onclick={handleZoomIn} variant="outline" size="icon-sm" disabled={zoom >= 200}>
						<PlusIcon class="size-4" />
					</Button>
				</div>
			</div>
			<!-- Page indicator toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Show page number</span>
				<button
					class="toggle"
					title="Page Number"
					class:toggle-on={showPageIndicator}
					onclick={() => (showPageIndicator = !showPageIndicator)}
					role="switch"
					aria-checked={showPageIndicator}
				>
					<span class="toggle-thumb" class:toggle-thumb-on={showPageIndicator}></span>
				</button>
			</label>
			<!-- Search on selection toggle -->
			<label class="flex items-center justify-between">
				<span class="text-sm font-medium">Search on selection</span>
				<button
					class="toggle"
					title="Search on selection"
					class:toggle-on={searchOnSelection}
					onclick={() => (searchOnSelection = !searchOnSelection)}
					role="switch"
					aria-checked={searchOnSelection}
				>
					<span class="toggle-thumb" class:toggle-thumb-on={searchOnSelection}></span>
				</button>
			</label>
			<!-- Selection time control -->
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">Selection time</span>
				<div class="flex items-center gap-3">
					<Button
						onclick={() => (selectionTime = Math.max(0, selectionTime - 50))}
						variant="outline"
						size="icon-sm"
						disabled={selectionTime <= 0}
					>
						<MinusIcon class="size-4" />
					</Button>
					<span class="w-16 text-center text-sm tabular-nums">{selectionTime}ms</span>
					<Button
						onclick={() => (selectionTime = Math.min(500, selectionTime + 50))}
						variant="outline"
						size="icon-sm"
						disabled={selectionTime >= 500}
					>
						<PlusIcon class="size-4" />
					</Button>
				</div>
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>

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

	.page-indicator {
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.75rem;
		color: hsl(var(--muted-foreground));
		background: hsl(var(--card) / 0.85);
		border: 1px solid hsl(var(--border));
		border-radius: 9999px;
		padding: 0.25rem 0.75rem;
		z-index: 40;
		backdrop-filter: blur(4px);
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}

	.toggle {
		position: relative;
		width: 2.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		background: hsl(var(--muted));
		border: none;
		cursor: pointer;
		transition: background 150ms;
	}

	.toggle-on {
		background: hsl(var(--primary));
	}

	.toggle-thumb {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: white;
		transition: transform 150ms;
	}

	.toggle-thumb-on {
		transform: translateX(1rem);
	}
</style>
