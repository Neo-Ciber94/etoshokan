import z from 'zod';
import { get, set, del, values, clear as idbClear, createStore } from 'idb-keyval';
import type { UseStore } from 'idb-keyval';
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { BaseModel } from '../types';

type IDBConfig = {
	dbName: string;
	storeName: string;
};

export class IndexedDbStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	private mainStore: UseStore;

	constructor(config: IDBConfig) {
		super();
		const { dbName, storeName } = config;
		this.mainStore = createStore(dbName, storeName);
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

	async get(id: string, ctx: StorageAdapterContext<T>): Promise<T | null> {
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

	async has(id: string, ctx: StorageAdapterContext<T>): Promise<boolean> {
		return (await this.get(id, ctx)) != null;
	}

	async set(value: Omit<T, 'id'>, _ctx: StorageAdapterContext<T>): Promise<T> {
		const id = crypto.randomUUID();
		const newValue = { id, ...value } as T;
		await set(id, newValue, this.mainStore);
		return newValue;
	}

	async update(value: T, _ctx: StorageAdapterContext<T>): Promise<T> {
		await set(value.id, value, this.mainStore);
		return value;
	}

	async remove(id: string, ctx: StorageAdapterContext<T>): Promise<boolean> {
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
