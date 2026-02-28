import { queryOptions } from '@tanstack/svelte-query';
import type { WordEntry } from '$lib/dictionary/core/dictionary';

export const DEFAULT_CATEGORY = '⭐ Common';

const STORAGE_KEY = 'etoshokan:saved-words';

export interface SavedCategory {
	category: string;
	words: WordEntry[];
}

export function loadSavedWords(): SavedCategory[] {
	if (typeof localStorage === 'undefined') {
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return [{ category: DEFAULT_CATEGORY, words: [] }];
		}

		const parsed = JSON.parse(raw);
		const categories = parsed as SavedCategory[];

		if (!categories.some((c) => c.category === DEFAULT_CATEGORY)) {
			categories.unshift({ category: DEFAULT_CATEGORY, words: [] });
		}
		return categories;
	} catch (err) {
		console.error(err);
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
}

export function persistSavedWords(categories: SavedCategory[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

const savedWordsQueryKey = ['words', 'saved'] as const;

export function savedWordsQuery() {
	return queryOptions({
		queryKey: savedWordsQueryKey,
		queryFn: async () => loadSavedWords(),
		initialData: loadSavedWords,
		staleTime: Infinity
	});
}
