import {
	get,
	set,
	del,
	keys as idbKeys,
	values as idbValues,
	entries as idbEntries,
	clear as idbClear,
	createStore
} from 'idb-keyval'
import type { UseStore } from 'idb-keyval'

export type IndexDbStore<V = unknown> = {
	get(key: string): Promise<V | undefined>
	set(key: string, value: V): Promise<void>
	delete(key: string): Promise<void>
	keys(): Promise<string[]>
	values(): Promise<V[]>
	entries(): Promise<[string, V][]>
	clear(): Promise<void>
}

export function createIndexDbStore<V = unknown>(dbName: string, storeName: string): IndexDbStore<V> {
	const store: UseStore = createStore(dbName, storeName)

	return {
		get: (key) => get<V>(key, store),
		set: (key, value) => set(key, value, store),
		delete: (key) => del(key, store),
		keys: () => idbKeys<string>(store),
		values: () => idbValues<V>(store),
		entries: () => idbEntries<string, V>(store),
		clear: () => idbClear(store)
	}
}
