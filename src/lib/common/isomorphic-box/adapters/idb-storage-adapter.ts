import z from 'zod';
import { get, set, del, values, clear as idbClear, createStore } from 'idb-keyval';
import type { UseStore } from 'idb-keyval';
import {
	StorageAdapter,
	type StorageAdapterContext,
	type KeyValueStorage
} from '../storage-adapter';
import type { HasId } from '../types';

type IDBConfig = {
	dbName: string;
	storeName: string;
};

class KeyValueIdbStorage implements KeyValueStorage {
	constructor(private store: UseStore) {}

	set(key: string, value: unknown): Promise<void> {
		return set(key, value, this.store);
	}

	get(key: string): Promise<unknown> {
		return get(key, this.store);
	}

	async delete(key: string): Promise<boolean> {
		const existing = await get<unknown>(key, this.store);
		if (existing === undefined) {
			return false;
		}
		await del(key, this.store);
		return true;
	}

	getAll(): Promise<unknown[]> {
		return values(this.store);
	}
}

class IndexedDbAdapterImpl<T extends HasId> extends StorageAdapter<T> {
	readonly local: KeyValueStorage;
	private mainStore: UseStore;

	constructor(config: IDBConfig) {
		super();
		const { dbName, storeName } = config;
		this.mainStore = createStore(dbName, storeName);
		this.local = new KeyValueIdbStorage(createStore(dbName, `${storeName}/kv`));
	}

	async getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		try {
			const items = await values(this.mainStore);
			return z.array(ctx.schema).parse(items);
		} catch (err) {
			console.error(err);
			return [];
		}
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		const item = await get(id, this.mainStore);
		if (item === undefined) {
			return null;
		}
		try {
			return ctx.schema.parse(item);
		} catch (err) {
			console.error(err);
			return null;
		}
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		return (await this.getById(id, ctx)) != null;
	}

	async add(value: Omit<T, 'id'>): Promise<T> {
		const newValue = { id: crypto.randomUUID(), ...value } as T;
		await set(newValue.id, newValue, this.mainStore);
		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}
		await del(id, this.mainStore);
		return true;
	}

	clear(): Promise<void> {
		return idbClear(this.mainStore);
	}
}

export function createIndexedDbAdapter<T extends HasId>(config: IDBConfig): StorageAdapter<T> {
	return new IndexedDbAdapterImpl(config);
}
