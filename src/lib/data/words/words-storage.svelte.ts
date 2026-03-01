import { createQuery, queryOptions, useQueryClient } from '@tanstack/svelte-query';
import type { WordEntry } from '$lib/dictionary/core/dictionary';
import { dictionary } from '$lib/dictionary';
import { RemoteStorageAdapter } from '$lib/common/isomorphic-box/adapters/remote-storage-adapter';
import { LocalFirstStorageAdapter } from '$lib/common/isomorphic-box/adapters/local-first-storage-adapter';
import { synchronizeCollection } from '$lib/common/isomorphic-box';
import { wordsCollection, DEFAULT_CATEGORY } from './words-collection';
import { savedWordsQueryKey, type SavedCategory } from './words.queries';
import { IndexedDbStorageAdapter } from '$lib/common/isomorphic-box/adapters/idb-storage-adapter';
import {
	getAllWordCategories,
	createWordCategory,
	updateWordCategory,
	removeWordCategory
} from '$lib/remote/words.remote';
import { QUERY_CLIENT } from '../../../routes/query';

export type { SavedCategory };
export { DEFAULT_CATEGORY };

const wordStorage = wordsCollection.adapt(
	new LocalFirstStorageAdapter({
		key: 'words',
		isOnline: () => Promise.resolve(typeof navigator !== 'undefined' ? navigator.onLine : false),
		localStorage: new IndexedDbStorageAdapter({
			dbName: 'etoshokan-words',
			storeName: 'categories'
		}),
		remoteStorage: new RemoteStorageAdapter({
			get: () => {
				throw new Error('No implemented');
			},
			getAll: async () => {
				const result = await getAllWordCategories();
				if (!result.success) throw new Error(result.error);
				return result.data;
			},
			create: async (value) => {
				const result = await createWordCategory(value);
				if (!result.success) throw new Error(result.error);
				return result.data;
			},
			update: async (value) => {
				const result = await updateWordCategory(value);
				if (!result.success) throw new Error(result.error);
				return result.data;
			},
			remove: async (id) => {
				const result = await removeWordCategory({ id });
				if (!result.success) throw new Error(result.error);
				return result.data;
			}
		})
	})
);

async function resolveCategories(): Promise<SavedCategory[]> {
	await dictionary.initialize();
	const stored = await wordStorage.getAll();
	const result: SavedCategory[] = [];
	for (const c of stored) {
		const entries = await Promise.all(c.words.map((id) => dictionary.getById(id)));
		const words = entries.filter((w): w is WordEntry => w !== null);
		result.push({ category: c.category, words });
	}
	return result;
}

export async function synchronizeWordsCollection() {
	await synchronizeCollection(wordStorage);
	QUERY_CLIENT.invalidateQueries({ queryKey: savedWordsQueryKey });
}

function savedWordsQuery() {
	return queryOptions({
		queryKey: savedWordsQueryKey,
		queryFn: resolveCategories,
		staleTime: Infinity
	});
}

export function useSavedWords() {
	const query = createQuery(() => savedWordsQuery());
	const queryClient = useQueryClient();

	function invalidate() {
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

		async save(entry: WordEntry, category?: string) {
			await wordStorage.save(entry, category);
			invalidate();
		},

		async delete(id: string) {
			await wordStorage.delete(id);
			invalidate();
		},

		async addCategory(name: string) {
			await wordStorage.addCategory(name);
			invalidate();
		},

		async renameCategory(oldName: string, newName: string) {
			await wordStorage.renameCategory(oldName, newName);
			invalidate();
		},

		async deleteCategory(name: string) {
			await wordStorage.deleteCategory(name);
			invalidate();
		}
	};
}
