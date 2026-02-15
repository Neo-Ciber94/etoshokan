<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		getBook,
		getBookMetadataById,
		updateBookProgress,
		updateBookZoom
	} from '$lib/ebook/books.storage';
	import type { BookMetadata, TocItem } from '$lib/ebook/types';
	import { createFoliateView, type FoliateView } from '$lib/types/view';
	import EBookContextMenu from '$lib/components/EBookContextMenu.svelte';
	import EBookOptionsDrawer from '$lib/components/EBookOptionsDrawer.svelte';
	import EBookTableOfContents from '$lib/components/EBookTableOfContents.svelte';
	import { usePointer } from '$lib/runes/pointer.svelte';
	import { useStorage } from '$lib/runes/local-storage.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { debounce } from '$lib/runes/debounce.svelte';
	import TranslationBox from '$lib/components/TranslationBox.svelte';
	import { cn, isMobile, isWeb } from '$lib/utils';
	import { readingMode } from '$lib/stores/reading-mode.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import { open_chrome } from 'tauri-plugin-in-app-browser-api';
	import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

	// svelte-ignore non_reactive_update
	let readerContainer: HTMLDivElement;

	const pointer = usePointer();
	let bookId = $derived(page.params.id || '');
	let view = $state<FoliateView | null>(null);
	let loading = $state(false);
	let notFound = $state(false);
	let isReady = $state(false);
	let bookMetadata = $state<BookMetadata | null>(null);

	// Context menu state
	let contextMenu = $state({ text: '', isOpen: false });

	// Zoom state
	let zoom = $state(100);

	// Drawer state
	let optionsDrawerOpen = $state(false);
	let tocDrawerOpen = $state(false);

	// Table of contents
	let toc = $state<TocItem[]>([]);
	let currentHref = $state('');

	// Translation state
	let showTranslation = $state(false);

	// Options persisted in localStorage
	const disableContextMenu = useStorage('reader:disableContextMenu', { defaultValue: false });
	const selectionTime = useStorage('reader:selectionTime', { defaultValue: 100 });
	const showPageIndicator = useStorage('reader:showPageIndicator', { defaultValue: false });
	const swipeNavigation = useStorage('reader:swipeNavigation', { defaultValue: true });
	const invertDirection = useStorage('reader:invertDirection', { defaultValue: false });
	const pageTransitions = useStorage('reader:pageTransitions', { defaultValue: true });

	// We only search on selection on mobile
	let searchOnSelection = $state(false);

	$effect.pre(() => {
		searchOnSelection = isMobile();
	});

	// Page state
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
		() => selectionTime.value,
		(doc: Document) => {
			if (disableContextMenu.value || contextMenu.isOpen) {
				return;
			}

			const selection = doc.getSelection();
			if (selection && selection.toString().trim()) {
				contextMenu.text = selection.toString().trim();
				contextMenu.isOpen = true;
			}
		}
	);

	onMount(async () => {
		await loadBook();
	});

	// Toggle reading mode
	$effect.pre(() => {
		readingMode.enter();

		return () => {
			readingMode.exit();
			if (view) {
				view.close();
			}
		};
	});

	// Sync pageTransitions option with renderer's animated attribute
	$effect(() => {
		if (!view?.renderer) return;
		if (pageTransitions.value) {
			view.renderer.setAttribute('animated', '');
		} else {
			view.renderer.removeAttribute('animated');
		}
	});

	async function loadBook() {
		loading = true;
		notFound = false;

		try {
			bookMetadata = await getBookMetadataById(bookId);

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

			// Stop loading to render the container
			loading = false;
			await tick();

			if (!readerContainer) {
				console.error('Reader container not found');
				notFound = true;
				return;
			}

			// Create typed foliate-view element
			const foliateView = await createFoliateView();
			foliateView.style.width = '100%';
			foliateView.style.height = '100%';
			readerContainer.appendChild(foliateView);
			view = foliateView;

			// Listen for section loads to attach event handlers
			foliateView.addEventListener('load', (e) => {
				const { doc } = e.detail;
				isReady = true;
				handleSectionLoad(doc);
			});

			// Listen for relocation events (progress tracking)
			foliateView.addEventListener('relocate', async (e) => {
				const detail = e.detail;
				const progress = Math.round((detail.fraction || 0) * 100);
				const cfi = detail.cfi || '';

				await updateBookProgress(bookId, cfi, progress);

				if (bookMetadata) {
					bookMetadata.currentCfi = cfi;
					bookMetadata.progress = progress;
					bookMetadata.lastReadAt = Date.now();
				}

				// Update page numbers
				if (detail.location) {
					currentPage = (detail.location.current ?? 0) + 1;
					totalPages = detail.location.total ?? 0;
				}

				// Track current chapter for TOC
				if (detail.tocItem) {
					currentHref = detail.tocItem.href || '';
				}
			});

			// Convert ArrayBuffer to File for foliate-js
			const file = new File([bookData], 'book.epub', { type: 'application/epub+zip' });
			await foliateView.open(file);

			// Force paginated horizontal layout
			foliateView.renderer.setAttribute('flow', 'paginated');
			if (pageTransitions.value) {
				foliateView.renderer.setAttribute('animated', '');
			}

			// Get TOC
			if (foliateView.book?.toc) {
				toc = foliateView.book.toc;
			}

			// Apply theme styles
			applyTheme();

			// Restore zoom level
			if (bookMetadata.zoom && bookMetadata.zoom > 100) {
				zoom = bookMetadata.zoom;
				applyZoomStyle();
			}

			// Restore reading position or start from beginning
			await foliateView.init({
				lastLocation: bookMetadata.currentCfi || undefined,
				showTextStart: !bookMetadata.currentCfi
			});
		} catch (error) {
			console.error('Error loading book:', error);
			notFound = true;
			loading = false;
		}
	}

	function handleSectionLoad(doc: Document) {
		// Get the iframe element for accurate coordinate mapping.
		// The foliate-view renders content inside an iframe nested within shadow DOMs
		// with grid margins, so we need the iframe's actual position, not the outer element's.
		const iframe = doc.defaultView?.frameElement as HTMLElement | null;

		doc.addEventListener('contextmenu', (e: Event) => {
			e.preventDefault();
		});

		doc.addEventListener('pointermove', (e: PointerEvent) => {
			if (iframe) {
				const rect = iframe.getBoundingClientRect();
				pointer.update(rect.left + e.clientX, rect.top + e.clientY);
			}
		});

		doc.addEventListener('pointerdown', (e: PointerEvent) => {
			if (contextMenu.isOpen) {
				return;
			}

			pagePointer.pointerDownX = e.clientX;
			pagePointer.pointerDownY = e.clientY;
			pagePointer.pointerDownTime = Date.now();
		});

		doc.addEventListener('pointerup', (e: PointerEvent) => {
			if (contextMenu.isOpen) {
				contextMenu.isOpen = false;
				return;
			}

			// Check for text selection and show context menu (debounced)
			if (!searchOnSelection) {
				showContextMenuIfSelection(doc);
			}

			// Fast-click toggle for page indicator
			const dx = e.clientX - pagePointer.pointerDownX;
			const dy = e.clientY - pagePointer.pointerDownY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const duration = Date.now() - pagePointer.pointerDownTime;
			const selection = doc.getSelection();
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

		// Handle text selection for search-on-selection
		doc.addEventListener('selectionchange', () => {
			if (!searchOnSelection) {
				return;
			}

			const selection = doc.getSelection();
			if (selection && selection.toString().trim()) {
				const selectedText = selection.toString().trim();
				contextMenu.text = selectedText;

				// Update pointer from selection rect
				if (selection.rangeCount > 0 && iframe) {
					const range = selection.getRangeAt(0);
					const rect = range.getBoundingClientRect();
					const iframeRect = iframe.getBoundingClientRect();
					pointer.update(iframeRect.left + rect.right, iframeRect.top + rect.bottom);
				}

				// Close first so the menu re-anchors to the current pointer position
				contextMenu.isOpen = false;
				showContextMenuIfSelection(doc);
			}
		});
	}

	function getThemeCss(withZoom = false): string {
		const isDark = document.documentElement.classList.contains('dark');
		const fontSize = withZoom && zoom > 100 ? ` font-size: ${zoom}% !important;` : '';
		return isDark
			? `
				body { color: #f1f5f9 !important; background: var(--background) !important;${fontSize} }
				p, div, span, h1, h2, h3, h4, h5, h6 { color: #f1f5f9 !important; }
				a { color: #60a5fa !important; }
			`
			: `
				body { color: var(--background) !important; background: #ffffff !important;${fontSize} }
				p, div, span, h1, h2, h3, h4, h5, h6 { color: var(--background) !important; }
				a { color: #3b82f6 !important; }
			`;
	}

	function applyTheme() {
		view?.renderer?.setStyles(getThemeCss(zoom > 100));
	}

	function applyZoomStyle() {
		view?.renderer?.setStyles(getThemeCss(true));
	}

	function closeBook() {
		goto('/ebook');
	}

	async function handleTranslate() {
		showTranslation = true;
	}

	async function handleSearch() {
		const jishoUrl = `https://jisho.org/search/${encodeURIComponent(contextMenu.text)}`;

		if (isWeb()) {
			console.log("Opening tab on browser")
			window.open(jishoUrl, '_blank');
		} else {
			try {
				console.log("Opening tab on chrome")
				await open_chrome({
					url: jishoUrl,
					toolbarColor: 'black'
				});
			} catch (err) {
				console.error('Failed to open tab: ', err);
				window.open(jishoUrl, '_blank');
			}
		}
	}

	function nextPage() {
		if (!view) {
			return;
		}

		if (invertDirection.value) {
			view.prev();
		} else {
			view.next();
		}
	}

	function prevPage() {
		if (!view) {
			return;
		}

		if (invertDirection.value) {
			view.next();
		} else {
			view.prev();
		}
	}

	// Zoom functions
	async function applyZoom(newZoom: number) {
		zoom = Math.min(200, Math.max(100, Math.round(newZoom / 10) * 10));
		applyZoomStyle();
		await updateBookZoom(bookId, zoom);
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
	class="fixed inset-0 mt-[env(safe-area-inset-top)] flex flex-col bg-background"
	role="application"
	oncontextmenu={(e) => e.preventDefault()}
>
	<div class="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3">
		<Button
			onclick={closeBook}
			variant="outline"
			size="icon-sm"
			class="w-auto px-1 sm:gap-1.5 sm:px-3"
		>
			<ArrowLeftIcon class="size-4" />
			<span class="inline">Back</span>
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
				disabled={!view || loading}
			>
				<ChevronUpIcon class="size-4" />
				<span class="hidden sm:inline">Prev</span>
			</Button>
			<Button
				onclick={nextPage}
				variant="outline"
				size="icon-sm"
				class="sm:w-auto sm:gap-1.5 sm:px-3"
				disabled={!view || loading}
			>
				<span class="hidden sm:inline">Next</span>
				<ChevronDownIcon class="size-4" />
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex h-full items-center justify-center">
			<Loading class="size-10" />
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
		<div
			class={cn(
				'relative mb-10 flex-1 overflow-hidden opacity-0 duration-500 md:mb-5',
				isReady && 'opacity-100'
			)}
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
	<TranslationBox searchTerm={contextMenu.text} onClose={() => (showTranslation = false)} />
{/if}

<EBookTableOfContents
	bind:open={tocDrawerOpen}
	{toc}
	{currentHref}
	onNavigate={(href) => view?.goTo(href)}
/>

<EBookOptionsDrawer
	bind:open={optionsDrawerOpen}
	{zoom}
	onZoomIn={handleZoomIn}
	onZoomOut={handleZoomOut}
	{showPageIndicator}
	{selectionTime}
	{disableContextMenu}
	{swipeNavigation}
	{invertDirection}
	{pageTransitions}
/>
