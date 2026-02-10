# Abstract EBook Reader Engine

## Context

epub.js (`epubjs@^0.3.93`) is unmaintained and tightly coupled throughout the reader. All epub.js usage lives in two Svelte pages and touches rendering, navigation, theming, pointer events, and text selection. The goal is to create an abstraction layer (following the existing `Dictionary` abstract class pattern) so the engine can be swapped without changing consumer code.

## API Design

### Core Types (`src/lib/ebook/core/types.ts`)

```ts
export type BookLocation = string; // opaque, engine-specific (CFI for epub.js)

export interface ParsedBookMetadata {
    title: string;
    author: string;
    coverDataUrl?: string;
}

export interface BookTheme {
    isDark: boolean;
    textColor: string;
    backgroundColor: string;
    linkColor: string;
}

export interface ReaderLocation {
    location: BookLocation;
    progress: number;       // 0..1
    currentPage?: number;
    totalPages?: number;
}

export interface ViewportPointerEvent {
    clientX: number;        // already translated to viewport
    clientY: number;
    originalEvent: PointerEvent;
}

export interface ViewportSelectionEvent {
    text: string;
    rect: { left: number; top: number; right: number; bottom: number };
}

export interface BookRendererEventMap {
    relocated: (location: ReaderLocation) => void;
    selected: (event: ViewportSelectionEvent) => void;
    pointermove: (event: ViewportPointerEvent) => void;
    pointerdown: (event: ViewportPointerEvent) => void;
    pointerup: (event: ViewportPointerEvent) => void;
}
```

### Abstract Classes (`src/lib/ebook/core/engine.ts`)

```ts
export abstract class BookEngine {
    abstract readonly name: string;
    abstract parseMetadata(data: ArrayBuffer): Promise<ParsedBookMetadata>;
    abstract createRenderer(
        data: ArrayBuffer,
        container: HTMLElement,
        options?: { theme?: BookTheme }
    ): Promise<BookRenderer>;
}

export abstract class BookRenderer {
    abstract next(): Promise<void>;
    abstract prev(): Promise<void>;
    abstract display(location?: BookLocation): Promise<void>;
    abstract setTheme(theme: BookTheme): void;
    abstract setFontSize(percent: number): void;
    abstract on<K extends keyof BookRendererEventMap>(
        event: K,
        callback: BookRendererEventMap[K]
    ): () => void;                    // returns unsubscribe function
    abstract destroy(): void;
}
```

**Key design decisions:**
- `on()` returns unsubscribe functions (pairs naturally with `$effect` cleanup)
- All pointer/selection events deliver viewport-translated coordinates (engine handles iframe offset internally)
- `contextmenu` prevention and `touchAction: none` are engine-internal, not exposed
- `parseMetadata` includes cover extraction (single call replaces `book.ready` + `metadata` + `coverUrl()` dance)

## File Structure

```
src/lib/ebook/
    core/
        types.ts          -- all type definitions above
        engine.ts         -- abstract BookEngine + BookRenderer
    engines/
        epubjs.ts         -- EpubJsEngine + EpubJsRenderer (private)
    index.ts              -- NEW: export const bookEngine = new EpubJsEngine()
    types.ts              -- MODIFIED: currentCfi → currentLocation
    storage.ts            -- MODIFIED: cfi param → location
```

## Implementation Steps

### 1. Create abstract layer
- **New** `src/lib/ebook/core/types.ts` - all interfaces and type definitions
- **New** `src/lib/ebook/core/engine.ts` - abstract `BookEngine` + `BookRenderer`

### 2. Create epub.js engine implementation
- **New** `src/lib/ebook/engines/epubjs.ts`
  - `EpubJsEngine.parseMetadata()` - wraps `ePub()` + `book.ready` + `book.loaded.metadata` + `book.coverUrl()` + blob→dataURL
  - `EpubJsEngine.createRenderer()` - wraps `ePub()` + `book.renderTo()`
  - `EpubJsRenderer` (private class):
    - Wires `rendition.hooks.content.register()` to emit `pointermove`/`pointerdown`/`pointerup` with coord translation
    - Wires `rendition.on('relocated')` to emit `relocated` with mapped `ReaderLocation`
    - Wires `rendition.on('selected')` to emit `selected` with viewport-translated rect
    - Handles `contextmenu` prevention and `touchAction: none` internally
    - Implements `setTheme()` by mapping `BookTheme` → `rendition.themes.default()` CSS object
    - Implements `setFontSize()` via `rendition.themes.fontSize()`
    - Uses internal `Map<string, Set<Function>>` for event subscriptions

### 3. Create singleton export
- **New** `src/lib/ebook/index.ts` - `export const bookEngine: BookEngine = new EpubJsEngine()`

### 4. Update types and storage
- **Modify** `src/lib/ebook/types.ts` - rename `currentCfi` → `currentLocation`
- **Modify** `src/lib/ebook/storage.ts` - rename `cfi` param → `location`, field access `currentCfi` → `currentLocation`

### 5. Update library page
- **Modify** `src/routes/ebook/+page.svelte`
  - Replace `import ePub from 'epubjs'` → `import { bookEngine } from '$lib/ebook'`
  - Replace metadata extraction block (lines 29-48) with `bookEngine.parseMetadata(arrayBuffer)`
  - Remove `blobToDataURL` helper (moved into engine)

### 6. Update reader page
- **Modify** `src/routes/ebook/[id]/+page.svelte`
  - Replace `import ePub, { type Book, type Rendition } from 'epubjs'` → `import { bookEngine } from '$lib/ebook'` + `import type { BookRenderer } from '$lib/ebook/core/engine'`
  - Replace `currentBook`/`rendition` state → single `renderer: BookRenderer | null`
  - Replace `loadBook()` initialization (lines 122-270) with:
    - `bookEngine.createRenderer(bookData, readerContainer, { theme })`
    - `renderer.display(bookMetadata.currentLocation)`
    - `renderer.on('relocated', ...)` for progress tracking
    - `renderer.on('selected', ...)` for text selection + context menu
    - `renderer.on('pointermove', ...)` for pointer tracking
    - `renderer.on('pointerdown/pointerup', ...)` for fast-click detection
  - Rework `showContextMenuIfSelection` debounce: the `selected` event provides text directly, so the debounce no longer needs `contents` param. Context menu triggering moves from `pointerup` → `selected` event handler
  - Simplify `nextPage`/`prevPage` → `renderer?.next()` / `renderer?.prev()`
  - Simplify `applyZoom` → `renderer?.setFontSize(zoom)`
  - Cleanup effect: `renderer?.destroy()` instead of `rendition?.destroy()`

## Verification

1. **Upload a book** on the library page - verify title, author, cover extract correctly
2. **Open a book** - verify it renders and displays
3. **Navigate** with Prev/Next buttons - verify page turns work
4. **Select text** - verify context menu appears at correct position
5. **Translate/Search** from context menu - verify text is passed correctly
6. **Toggle page indicator** via fast-click - verify pointer tracking works
7. **Zoom in/out** from options drawer - verify font size changes
8. **Close and reopen** a book - verify position and zoom restore from `currentLocation`
9. **Check dark mode** - verify theme applies correctly to book content
10. After all steps, confirm `epubjs` is imported **only** in `src/lib/ebook/engines/epubjs.ts`
