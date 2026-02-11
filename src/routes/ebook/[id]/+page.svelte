<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ePub, {
		type Book,
		type Rendition,
		type Location as EpubLocation,
		type Contents as EpubContents
	} from 'epubjs';
	import { Button } from '$lib/components/ui/button';
	import {
		getBook,
		getBooksMetadata,
		updateBookProgress,
		updateBookZoom
	} from '$lib/ebook/storage';
	import type { BookMetadata } from '$lib/ebook/types';
	import type { NavItem } from 'epubjs';
	import EBookContextMenu from '$lib/components/EBookContextMenu.svelte';
	import EBookOptionsDrawer from '$lib/components/EBookOptionsDrawer.svelte';
	import EBookTableOfContents from '$lib/components/EBookTableOfContents.svelte';
	import { usePointer } from '$lib/runes/pointer.svelte';
	import { useStorage } from '$lib/runes/local-storage.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { debounce } from '$lib/runes/debounce.svelte';
	import TranslationBox from '$lib/components/TranslationBox.svelte';
	import { dictionary } from '$lib/dictionary';
	import type { WordEntry } from '$lib/dictionary/core/dictionary';
	import { delay } from '$lib/utils';

	const TRANSITION_DURATION_MS = 300;
	const pointer = usePointer();

	let bookId = $derived(page.params.id || '');
	let currentBook = $state<Book | null>(null);
	let rendition = $state<Rendition | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let readerContainer: HTMLDivElement;
	let bookMetadata = $state<BookMetadata | null>(null);

	// Context menu state (object so iframe closures see current values via the proxy)
	let contextMenu = $state({ text: '', isOpen: false });

	// Zoom state
	let zoom = $state(100);

	// Drawer state
	let optionsDrawerOpen = $state(false);
	let tocDrawerOpen = $state(false);

	// Table of contents
	let toc = $state<NavItem[]>([]);
	let currentHref = $state('');

	// Translation state
	let showTranslation = $state(false);
	let translationEntries = $state<WordEntry[]>([]);
	let translationLoading = $state(false);

	// Options persisted in localStorage
	const disableContextMenu = useStorage('reader:disableContextMenu', { defaultValue: false });
	const searchOnSelection = useStorage('reader:searchOnSelection', { defaultValue: false });
	const selectionTime = useStorage('reader:selectionTime', { defaultValue: 100 });
	const showPageIndicator = useStorage('reader:showPageIndicator', { defaultValue: false });
	const swipeNavigation = useStorage('reader:swipeNavigation', { defaultValue: true });
	const invertDirection = useStorage('reader:invertDirection', { defaultValue: false });
	const pageTransitions = useStorage('reader:pageTransitions', { defaultValue: true });

	// Page transition state
	let transitionDir = $state<'next' | 'prev' | null>(null);
	let transitionEnabled = $state(true);

	// Page state
	let currentPage = $state(0);
	let totalPages = $state(0);
	$inspect(currentPage, totalPages).with(console.log);

	// Pointer tracking for fast-click detection
	let pagePointer = $state({
		pointerDownX: 0,
		pointerDownY: 0,
		pointerDownTime: 0
	});

	// Debounced context menu trigger on pointer up
	const showContextMenuIfSelection = debounce(
		() => selectionTime.value,
		(contents: any) => {
			if (disableContextMenu.value || contextMenu.isOpen) {
				return;
			}

			const selection = contents.window.getSelection();
			if (selection && selection.toString().trim()) {
				contextMenu.text = selection.toString().trim();
				contextMenu.isOpen = true;
			}
		}
	);

	onMount(async () => {
		dictionary.initialize().catch((err) => console.error('Failed to load dictionary', err));
		await loadBook();
	});

	// Toggle reading mode class on body
	$effect.pre(() => {
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

			currentBook.loaded.navigation.then((nav) => {
				toc = nav.toc;
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
			rendition.hooks.content.register((contents: EpubContents) => {
				contents.document.addEventListener('contextmenu', (e: Event) => {
					e.preventDefault();
				});

				contents.document.addEventListener('pointermove', (e: PointerEvent) => {
					const iframe = readerContainer.querySelector('iframe');
					const iframeRect = iframe?.getBoundingClientRect();
					pointer.update((iframeRect?.left || 0) + e.clientX, (iframeRect?.top || 0) + e.clientY);
				});

				contents.document.addEventListener('pointerdown', (e: PointerEvent) => {
					if (contextMenu.isOpen) {
						return;
					}

					pagePointer.pointerDownX = e.clientX;
					pagePointer.pointerDownY = e.clientY;
					pagePointer.pointerDownTime = Date.now();
				});

				contents.document.addEventListener('pointerup', (e: PointerEvent) => {
					if (contextMenu.isOpen) {
						contextMenu.isOpen = false;
						return;
					}

					// Check for text selection and show context menu (debounced)
					if (!searchOnSelection.value) {
						showContextMenuIfSelection(contents);
					}

					// Fast-click toggle for page indicator
					const dx = e.clientX - pagePointer.pointerDownX;
					const dy = e.clientY - pagePointer.pointerDownY;
					const distance = Math.sqrt(dx * dx + dy * dy);
					const duration = Date.now() - pagePointer.pointerDownTime;
					const selection = contents.window.getSelection();
					const hasSelection = selection && selection.toString().trim().length > 0;

					if (distance <= 10 && duration <= 500 && !hasSelection && !contextMenu.isOpen) {
						showPageIndicator.value = !showPageIndicator.value;
					}

					// Swipe navigation
					if (
						swipeNavigation.value &&
						!hasSelection &&
						Math.abs(dx) > 50 &&
						Math.abs(dx) > Math.abs(dy) * 1.5
					) {
						if (dx > 0) prevPage();
						else nextPage();
					}
				});

				contents.document.documentElement.style.touchAction = 'none';
			});

			// Wait for book spine/metadata to load, then generate locations
			await currentBook.ready;
			const generatedLocations = await currentBook.locations.generate(1024);
			totalPages = generatedLocations.length;

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
			rendition.on('relocated', async (location: EpubLocation) => {
				const progress = Math.round((location.start.percentage || 0) * 100);
				await updateBookProgress(bookId, location.start.cfi, progress);

				// Update local metadata
				if (bookMetadata) {
					bookMetadata.currentCfi = location.start.cfi;
					bookMetadata.progress = progress;
					bookMetadata.lastReadAt = Date.now();
				}

				// Update page numbers (book-wide, not per-chapter)
				if (totalPages > 0) {
					currentPage = location.start.location + 1;
				}

				// Track current chapter for TOC
				currentHref = location.start.href;

				// Clear page transition after new page renders
				transitionDir = null;
			});

			// Track text selection and show context menu
			rendition.on('selected', async (cfiRange: string, contents: EpubContents) => {
				const selection = contents.window.getSelection();

				if (selection && selection.toString()) {
					const selectedText = selection.toString().trim();
					if (!selectedText) {
						return;
					}

					contextMenu.text = selectedText;

					// Update pointer from selection rect (pointermove doesn't fire during selection on mobile)
					if (selection.rangeCount > 0) {
						const range = selection.getRangeAt(0);
						const rect = range.getBoundingClientRect();
						const iframe = readerContainer.querySelector('iframe');
						const iframeRect = iframe?.getBoundingClientRect();
						pointer.update(
							(iframeRect?.left || 0) + rect.right,
							(iframeRect?.top || 0) + rect.bottom
						);
					}

					if (searchOnSelection.value) {
						// Close first so the menu re-anchors to the current pointer position
						contextMenu.isOpen = false;
						showContextMenuIfSelection(contents);
					}
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
			translationEntries = await dictionary.lookup(contextMenu.text.trim(), {
				targetLanguage: 'en'
			});
		} catch {
			translationEntries = [];
		} finally {
			translationLoading = false;
		}
	}

	function handleSearch() {
		window.open(`https://jisho.org/search/${encodeURIComponent(contextMenu.text)}`, '_blank');
	}

	async function nextPage() {
		if (pageTransitions.value) {
			transitionDir = 'next'; // exit left
			await delay(TRANSITION_DURATION_MS);

			// Snap to opposite side without transition
			transitionEnabled = false;
			transitionDir = 'prev'; // position on right
			await tick();
			void readerContainer.offsetHeight; // force reflow
			transitionEnabled = true;
		}

		if (invertDirection.value) {
			rendition?.prev();
		} else {
			rendition?.next();
		}
	}

	async function prevPage() {
		if (pageTransitions.value) {
			transitionDir = 'prev'; // exit right
			await delay(TRANSITION_DURATION_MS);

			// Snap to opposite side without transition
			transitionEnabled = false;
			transitionDir = 'next'; // position on left
			await tick();
			void readerContainer.offsetHeight; // force reflow
			transitionEnabled = true;
		}

		if (invertDirection.value) {
			rendition?.next();
		} else {
			rendition?.prev();
		}
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

<section
	class="fixed inset-0 flex flex-col bg-background"
	role="application"
	oncontextmenu={(e) => e.preventDefault()}
>
	<div class="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
		<Button
			onclick={closeBook}
			variant="outline"
			size="icon-sm"
			class="sm:w-auto sm:gap-1.5 sm:px-3"
		>
			<ArrowLeftIcon class="size-4" />
			<span class="hidden sm:inline">Back</span>
		</Button>
		<button
			class="min-w-0 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
			onclick={() => (tocDrawerOpen = true)}
		>
			{bookMetadata?.title || 'Loading...'}
		</button>
		<div class="flex items-center gap-2">
			<Button onclick={() => (optionsDrawerOpen = true)} variant="ghost" size="icon-sm">
				<SettingsIcon class="size-4" />
			</Button>
			<Button
				onclick={prevPage}
				variant="outline"
				size="icon-sm"
				class="sm:w-auto sm:gap-1.5 sm:px-3"
				disabled={!rendition || loading}
			>
				<ChevronLeftIcon class="size-4" />
				<span class="hidden sm:inline">Prev</span>
			</Button>
			<Button
				onclick={nextPage}
				variant="outline"
				size="icon-sm"
				class="sm:w-auto sm:gap-1.5 sm:px-3"
				disabled={!rendition || loading}
			>
				<span class="hidden sm:inline">Next</span>
				<ChevronRightIcon class="size-4" />
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
		{@const TRANSITION_CLASS = { next: 'translateX(-50%)', prev: 'translateX(50%)', '': '' }}

		<div
			class="relative flex-1 touch-none overflow-hidden [&_iframe]:touch-none {transitionEnabled
				? 'transition-[transform,opacity] ease-in-out'
				: ''}"
			style:transition-duration={`${TRANSITION_DURATION_MS}ms`}
			style:opacity={transitionDir ? '0' : '1'}
			style:transform={TRANSITION_CLASS[transitionDir || '']}
		>
			<div bind:this={readerContainer} class="h-full w-full"></div>
		</div>

		<EBookContextMenu
			bind:open={contextMenu.isOpen}
			x={pointer.x}
			y={pointer.y}
			onTranslate={handleTranslate}
			onSearch={handleSearch}
		/>

		<!-- Page indicator -->
		{#if showPageIndicator.value && totalPages > 0}
			<div
				class="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-card/85 px-3 py-1 text-xs text-muted-foreground tabular-nums backdrop-blur-sm"
			>
				{currentPage} / {totalPages}
			</div>
		{/if}
	{/if}
</section>

<!-- Translation box -->
{#if showTranslation}
	<TranslationBox
		selectedText={contextMenu.text}
		entries={translationEntries}
		loading={translationLoading}
		onClose={() => (showTranslation = false)}
	/>
{/if}

<EBookTableOfContents
	bind:open={tocDrawerOpen}
	{toc}
	{currentHref}
	onNavigate={(href) => rendition?.display(href)}
/>

<EBookOptionsDrawer
	bind:open={optionsDrawerOpen}
	{zoom}
	onZoomIn={handleZoomIn}
	onZoomOut={handleZoomOut}
	{showPageIndicator}
	{searchOnSelection}
	{selectionTime}
	{disableContextMenu}
	{swipeNavigation}
	{invertDirection}
	{pageTransitions}
/>
