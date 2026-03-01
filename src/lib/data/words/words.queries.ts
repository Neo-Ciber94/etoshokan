import type { WordEntry } from '$lib/dictionary/core/dictionary';

export const savedWordsQueryKey = ['words', 'saved'] as const;

export interface SavedCategory {
	category: string;
	words: WordEntry[];
}
