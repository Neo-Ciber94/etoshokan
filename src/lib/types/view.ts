import type { TocItem } from '$lib/ebook/types';

// ── Event detail types ────────────────────────────────────────────────

export interface FoliateLocationInfo {
	current: number;
	next: number;
	total: number;
}

export interface FoliateSectionInfo {
	current: number;
	total: number;
}

export interface FoliateTimeInfo {
	/** Minutes remaining in current section */
	section: number;
	/** Minutes remaining in entire book */
	total: number;
}

export interface FoliateRelocateDetail {
	/** Overall book progress (0–1) */
	fraction: number;
	section: FoliateSectionInfo;
	location: FoliateLocationInfo;
	time: FoliateTimeInfo;
	/** Current TOC item, if available */
	tocItem: TocItem | null;
	/** Current page-list item, if available */
	pageItem: TocItem | null;
	/** EPUB CFI string for the current position */
	cfi: string;
	/** DOM Range of the visible content */
	range: Range;
}

export interface FoliateLoadDetail {
	/** The Document of the loaded section */
	doc: Document;
	/** Section index in the spine */
	index: number;
}

export interface FoliateLinkDetail {
	a: HTMLAnchorElement;
	href: string;
}

export interface FoliateAnnotation {
	value: string;
	color?: string;
	note?: string;
}

export interface FoliateAnnotationResult {
	index: number;
	label: string;
}

// ── Search types ──────────────────────────────────────────────────────

export interface FoliateSearchOptions {
	query: string;
	index?: number;
	sensitivity?: 'base' | 'variant';
	granularity?: 'word' | 'grapheme' | 'sentence';
	ignoreDiacritics?: boolean;
}

export interface FoliateSearchExcerpt {
	pre: string;
	match: string;
	post: string;
}

export interface FoliateSearchResultItem {
	cfi: string;
	excerpt: FoliateSearchExcerpt;
}

export type FoliateSearchResult =
	| { progress: number }
	| { index: number; subitems: FoliateSearchResultItem[]; label: string }
	| 'done';

// ── Navigation types ──────────────────────────────────────────────────

export type FoliateNavTarget = string | number | { fraction: number };

export interface FoliateResolvedNav {
	index: number;
	anchor?: ((doc: Document) => Range | Element) | number;
}

// ── Init options ──────────────────────────────────────────────────────

export interface FoliateInitOptions {
	/** CFI, href, or index to restore */
	lastLocation?: FoliateNavTarget;
	/** Navigate to the start of the body matter */
	showTextStart?: boolean;
}

// ── Book section ──────────────────────────────────────────────────────

export interface FoliateBookSection {
	load(): string | Promise<string>;
	unload?(): void;
	createDocument?(): Document | Promise<Document>;
	size: number;
	linear?: 'no' | string;
	cfi?: string;
	id: string;
	mediaOverlay?: unknown;
	resolveHref?(href: string): string;
}

// ── Book metadata ─────────────────────────────────────────────────────

export interface FoliateBookMetadata {
	title: string | Record<string, string>;
	author: string | string[];
	language: string;
	identifier?: string;
	description?: string;
	publisher?: string;
	[key: string]: unknown;
}

// ── Landmark ──────────────────────────────────────────────────────────

export interface FoliateLandmark {
	type: string[];
	href: string;
	label?: string;
}

// ── Book ──────────────────────────────────────────────────────────────

export interface FoliateBook {
	metadata: FoliateBookMetadata;
	sections: FoliateBookSection[];
	toc: TocItem[];
	pageList?: TocItem[];
	landmarks?: FoliateLandmark[];
	dir: 'ltr' | 'rtl';
	rendition?: { layout: 'reflowable' | 'pre-paginated' };
	media?: { activeClass: string; playbackActiveClass?: string };

	resolveHref(href: string): FoliateResolvedNav;
	resolveCFI?(cfi: string): FoliateResolvedNav;
	splitTOCHref?(href: string): Promise<[string, string]> | [string, string];
	getTOCFragment?(doc: Document, id: string): Node | null;
	isExternal?(href: string): boolean;
	getMediaOverlay?(): EventTarget;
}

// ── Renderer contents ─────────────────────────────────────────────────

export interface FoliateRendererContents {
	index: number;
	doc: Document;
	overlayer?: unknown;
}

// ── Renderer ──────────────────────────────────────────────────────────

export interface FoliateRenderer extends HTMLElement {
	open(book: FoliateBook): void;
	goTo(target: FoliateResolvedNav): Promise<void>;
	prev(distance?: number): Promise<void>;
	next(distance?: number): Promise<void>;
	destroy(): void;
	getContents(): FoliateRendererContents[];
	setStyles(css: string | [string, string]): void;
	scrollToAnchor(anchor: Range | Element, select?: boolean): Promise<void>;

	heads: HTMLElement[];
	feet: HTMLElement[];
	scrolled: boolean;
	columnCount: number;
}

// ── History ───────────────────────────────────────────────────────────

export interface FoliateHistory extends EventTarget {
	pushState(x: unknown): void;
	replaceState(x: unknown): void;
	back(): void;
	forward(): void;
	clear(): void;
	readonly canGoBack: boolean;
	readonly canGoForward: boolean;
}

// ── Language info ─────────────────────────────────────────────────────

export interface FoliateLanguageInfo {
	canonical?: string;
	locale?: Intl.Locale;
	isCJK?: boolean;
	direction?: string;
}

// ── View (the <foliate-view> custom element) ──────────────────────────

export interface FoliateView extends HTMLElement {
	// ── Properties ────────────────────────────────────────────────────
	book: FoliateBook;
	renderer: FoliateRenderer;
	isFixedLayout: boolean;
	lastLocation: FoliateRelocateDetail | null;
	history: FoliateHistory;
	language: FoliateLanguageInfo;
	tts: unknown;
	mediaOverlay: EventTarget | null;

	// ── Lifecycle ─────────────────────────────────────────────────────
	open(book: File | Blob | string | FoliateBook): Promise<void>;
	close(): void;
	init(options: FoliateInitOptions): Promise<void>;

	// ── Navigation ────────────────────────────────────────────────────
	goTo(target: FoliateNavTarget): Promise<FoliateResolvedNav | undefined>;
	goToFraction(fraction: number): Promise<void>;
	goToTextStart(): Promise<FoliateResolvedNav | undefined>;
	prev(distance?: number): Promise<void>;
	next(distance?: number): Promise<void>;
	goLeft(): Promise<void>;
	goRight(): Promise<void>;

	// ── Selection ─────────────────────────────────────────────────────
	select(target: FoliateNavTarget): Promise<void>;
	deselect(): void;

	// ── CFI utilities ─────────────────────────────────────────────────
	getCFI(index: number, range?: Range): string;
	resolveCFI(cfi: string): FoliateResolvedNav;
	resolveNavigation(target: FoliateNavTarget): FoliateResolvedNav | undefined;

	// ── Progress ──────────────────────────────────────────────────────
	getSectionFractions(): number[];
	getProgressOf(
		index: number,
		range?: Range
	): { tocItem: TocItem | null; pageItem: TocItem | null };
	getTOCItemOf(target: FoliateNavTarget): Promise<TocItem | null | undefined>;

	// ── Annotations ───────────────────────────────────────────────────
	addAnnotation(
		annotation: FoliateAnnotation,
		remove?: boolean
	): Promise<FoliateAnnotationResult | undefined>;
	deleteAnnotation(annotation: FoliateAnnotation): Promise<FoliateAnnotationResult | undefined>;
	showAnnotation(annotation: FoliateAnnotation): Promise<void>;

	// ── Search ────────────────────────────────────────────────────────
	search(opts: FoliateSearchOptions): AsyncGenerator<FoliateSearchResult>;
	clearSearch(): void;

	// ── TTS / Media Overlay ───────────────────────────────────────────
	initTTS(granularity?: 'word' | 'grapheme' | 'sentence'): Promise<void>;
	startMediaOverlay(): unknown;

	// ── Events (typed addEventListener overloads) ─────────────────────
	addEventListener(
		type: 'relocate',
		listener: (event: CustomEvent<FoliateRelocateDetail>) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: 'load',
		listener: (event: CustomEvent<FoliateLoadDetail>) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: 'link' | 'external-link',
		listener: (event: CustomEvent<FoliateLinkDetail>) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: 'show-annotation',
		listener: (event: CustomEvent<{ value: string; index: number; range: Range }>) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: 'create-overlay',
		listener: (event: CustomEvent<{ index: number }>) => void,
		options?: boolean | AddEventListenerOptions
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions
	): void;
}

// ── Factory ───────────────────────────────────────────────────────────

/**
 * Import `foliate-js/view.js` (which registers the `<foliate-view>`
 * custom element) and return a new, typed `FoliateView` instance.
 */
export async function createFoliateView(): Promise<FoliateView> {
	// @ts-expect-error this is a dynamic import of a js only library.
	await import('foliate-js/view.js');
	return document.createElement('foliate-view') as unknown as FoliateView;
}
