<script lang="ts">
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { dictionary } from '$lib/dictionary';
	import { readingMode } from '$lib/runes/reading-mode.svelte';
	import { debounce } from '$lib/runes/debounce.svelte';
	import { translateSelectionEnabled } from '$lib/runes/translate-selection.svelte';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import type { LookupResult } from '$lib/dictionary/core/dictionary';

	let word = $state('');
	let result = $state<LookupResult | null>(null);

	const EBOOK_READER_PATTERN = /^\/ebook\/.+/;

	const lookupSelection = debounce(300, async () => {
		try {
			if (
				!translateSelectionEnabled.value ||
				readingMode.active ||
				EBOOK_READER_PATTERN.test(page.url.pathname)
			) {
				word = '';
				result = null;
				return;
			}

			const text = window.getSelection()?.toString().trim() ?? '';

			if (!text) {
				word = '';
				result = null;
				return;
			}

			word = text;
			result = null;
			result = await dictionary.lookup(text, { maxResults: 1 });
		} catch (e) {
			console.error('TranslateSelection: lookup failed', e);
		}
	});

	$effect(() => {
		if (page.url.pathname != null) {
			word = '';
			result = null;
		}
	});

	$effect(() => {
		document.addEventListener('selectionchange', lookupSelection);
		return () => {
			document.removeEventListener('selectionchange', lookupSelection);
		};
	});

	const entry = $derived(result?.found ? result.entries[0] : null);
	const senses = $derived(entry?.senses.slice(0, 2) ?? []);
</script>

{#if result !== null}
	<div
		class="translate-card fixed bottom-4 left-1/2 z-50 max-w-xs min-w-48 -translate-x-1/2 rounded-xl border border-border bg-background/60 px-4 py-3 shadow-lg backdrop-blur-sm"
		transition:fly={{ y: 16, duration: 180 }}
	>
		{#if entry}
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<p class="mb-1 text-xs text-muted-foreground">"{word}"</p>
					<div class="flex items-baseline gap-2">
						<span class="text-base font-bold text-primary">{entry.term}</span>
						{#if entry.reading && entry.reading !== entry.term}
							<span class="text-xs text-muted-foreground">{entry.reading}</span>
						{/if}
					</div>
					{#if senses.length > 0}
						<p class="mt-1 truncate text-xs text-muted-foreground">
							{senses.map((s) => s.glosses.map((g) => g.text).join(', ')).join('; ')}
						</p>
					{/if}
				</div>
				<a
					href="/dictionary?search={encodeURIComponent(word)}"
					class="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-primary"
					aria-label="Open in dictionary"
				>
					<BookOpenIcon size={15} />
				</a>
			</div>
		{:else}
			<div class="flex items-center justify-between gap-3">
				<span class="text-sm font-semibold text-red-400">{word}</span>
				<a
					href="/dictionary?search={encodeURIComponent(word)}"
					class="shrink-0 text-muted-foreground transition-colors hover:text-primary"
					aria-label="Open in dictionary"
				>
					<BookOpenIcon size={15} />
				</a>
			</div>
		{/if}
	</div>
{/if}

<style>
	@media (max-width: 1024px) and (orientation: portrait) {
		.translate-card {
			bottom: calc(4rem + env(safe-area-inset-bottom) + 0.5rem);
		}
	}
</style>
