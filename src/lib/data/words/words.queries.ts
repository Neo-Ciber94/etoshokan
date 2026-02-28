import { queryOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import type { WordEntry } from '$lib/dictionary/core/dictionary';
import { dictionary } from '$lib/dictionary';

export const DEFAULT_CATEGORY = '⭐ Common';

const STORAGE_KEY = 'etoshokan:saved-words';
export const savedWordsQueryKey = ['words', 'saved'] as const;

const storedCategorySchema = z.object({
	category: z.string(),
	words: z.array(z.string())
});

const storedCategoriesSchema = z.array(storedCategorySchema);

export type StoredCategory = z.infer<typeof storedCategorySchema>;

export interface SavedCategory {
	category: string;
	words: WordEntry[];
}

export function loadStoredCategories(): StoredCategory[] {
	if (typeof localStorage === 'undefined') {
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
	try {
		const raw = localStorage.getItem(STORAGE_KEY);

		if (!raw) {
			return [{ category: DEFAULT_CATEGORY, words: [] }];
		}

		const parsed = storedCategoriesSchema.parse(JSON.parse(raw));

		if (!parsed.some((c) => c.category === DEFAULT_CATEGORY)) {
			parsed.unshift({ category: DEFAULT_CATEGORY, words: [] });
		}
		return parsed;
	} catch (err) {
		console.error(err);
		return [{ category: DEFAULT_CATEGORY, words: [] }];
	}
}

export function persistStoredCategories(categories: StoredCategory[]): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

async function resolveCategories(stored: StoredCategory[]): Promise<SavedCategory[]> {
	await dictionary.initialize();
	const result: SavedCategory[] = [];
	for (const c of stored) {
		const entryPromises = c.words.map((id) => dictionary.getById(id));
		const entries = await Promise.all(entryPromises);
		const words = entries.filter((w): w is WordEntry => w !== null);
		result.push({ category: c.category, words });
	}
	return result;
}

export function savedWordsQuery() {
	return queryOptions({
		queryKey: savedWordsQueryKey,
		queryFn: async () => resolveCategories(loadStoredCategories()),
		staleTime: Infinity
	});
}
