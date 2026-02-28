import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { WordEntry } from '$lib/dictionary/core/dictionary';
import {
	DEFAULT_CATEGORY,
	loadStoredCategories,
	persistStoredCategories,
	savedWordsQuery,
	savedWordsQueryKey,
	type SavedCategory,
	type StoredCategory
} from './words.queries';

export type { SavedCategory };
export { DEFAULT_CATEGORY };

export function useSavedWords() {
	const query = createQuery(() => savedWordsQuery());
	const queryClient = useQueryClient();

	function mutate(updater: (categories: StoredCategory[]) => StoredCategory[]) {
		persistStoredCategories(updater(loadStoredCategories()));
		queryClient.invalidateQueries({ queryKey: savedWordsQueryKey });
	}

	return {
		get categories() {
			return query.data ?? [];
		},

		get categoryNames() {
			return (query.data ?? []).map((c) => c.category);
		},

		isSaved(id: string) {
			return (query.data ?? []).some((c) => c.words.some((w) => w.id === id));
		},

		save(entry: WordEntry, category = DEFAULT_CATEGORY) {
			mutate((categories) => {
				const withoutEntry = categories.map((c) => ({
					...c,
					words: c.words.filter((id) => id !== entry.id)
				}));

				const idx = withoutEntry.findIndex((c) => c.category === category);

				if (idx >= 0) {
					const updated = [...withoutEntry];
					updated[idx] = { ...updated[idx], words: [...updated[idx].words, entry.id] };
					return updated;
				} else {
					return [...withoutEntry, { category, words: [entry.id] }];
				}
			});
		},

		delete(id: string) {
			mutate((categories) =>
				categories.map((c) => ({
					...c,
					words: c.words.filter((wordId) => wordId !== id)
				}))
			);
		},

		addCategory(name: string) {
			mutate((categories) => {
				if (categories.some((c) => c.category === name)) {
					return categories;
				}
				return [...categories, { category: name, words: [] }];
			});
		},

		renameCategory(oldName: string, newName: string) {
			mutate((categories) => {
				if (oldName === newName) {
					return categories;
				}
				if (categories.some((c) => c.category === newName)) {
					return categories;
				}
				return categories.map((c) => (c.category === oldName ? { ...c, category: newName } : c));
			});
		},

		deleteCategory(name: string) {
			if (name === DEFAULT_CATEGORY) {
				return;
			}
			mutate((categories) => categories.filter((c) => c.category !== name));
		}
	};
}
