import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import type { WordEntry } from '$lib/dictionary/core/dictionary';
import {
	DEFAULT_CATEGORY,
	loadSavedWords,
	persistSavedWords,
	savedWordsQuery,
	savedWordsQueryKey,
	type SavedCategory
} from './words.queries';

export type { SavedCategory };
export { DEFAULT_CATEGORY };

export function useSavedWords() {
	const query = createQuery(() => savedWordsQuery());
	const queryClient = useQueryClient();

	function mutate(updater: (categories: SavedCategory[]) => SavedCategory[]) {
		persistSavedWords(updater(loadSavedWords()));
		queryClient.invalidateQueries({ queryKey: savedWordsQueryKey });
	}

	return {
		get categories() {
			return query.data ?? [];
		},

		get categoryNames() {
			return (query.data ?? []).map((c) => c.category);
		},

		isSaved(term: string, language: string) {
			return (query.data ?? []).some((c) =>
				c.words.some((w) => w.term === term && w.language === language)
			);
		},

		save(entry: WordEntry, category = DEFAULT_CATEGORY) {
			mutate((categories) => {
				const withoutEntry = categories.map((c) => ({
					...c,
					words: c.words.filter((w) => !(w.term === entry.term && w.language === entry.language))
				}));

				const idx = withoutEntry.findIndex((c) => c.category === category);

				if (idx >= 0) {
					const updated = [...withoutEntry];
					updated[idx] = { ...updated[idx], words: [...updated[idx].words, entry] };
					return updated;
				} else {
					return [...withoutEntry, { category, words: [entry] }];
				}
			});
		},

		delete(term: string, language: string) {
			mutate((categories) =>
				categories.map((c) => ({
					...c,
					words: c.words.filter((w) => !(w.term === term && w.language === language))
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
