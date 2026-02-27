import z from 'zod';
import {
	StorageAdapter,
	type StorageAdapterContext,
	type KeyValueStorage
} from '../storage-adapter';
import type { HasId } from '../types';
import { Mutex } from '$lib/utils/mutex/mutex';

type StorageProvider = () => Storage;

export class LocalStorageAdapter<T extends HasId> extends StorageAdapter<T> {
	private storage: StorageProvider;
	readonly local: KeyValueStorage;

	constructor(
		readonly key: string,
		storage?: StorageProvider
	) {
		super();
		this.storage = storage ?? (() => localStorage);
		this.local = new KeyValueLocalStorage(`${key}/kv`, this.storage);
	}

	private getJson(ctx: StorageAdapterContext<T>) {
		const key = this.key;
		const storage = this.storage();
		const raw = storage.getItem(key);

		if (raw == null) {
			return [];
		}

		const result = z.array(ctx.schema).parse(JSON.parse(raw));
		return result;
	}

	private mutate(ctx: StorageAdapterContext<T>, updater: (values: T[]) => T[]) {
		const key = this.key;

		try {
			const value = this.getJson(ctx);
			const result = updater(value);
			localStorage.setItem(key, JSON.stringify(result));
		} catch (err) {
			console.error(err);
			const result = updater([]);
			localStorage.setItem(key, JSON.stringify(result));
		}
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		try {
			const result = this.getJson(ctx);
			return Promise.resolve(result);
		} catch (err) {
			console.error(err);
			return Promise.resolve([]);
		}
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		const results = await this.getAll(ctx);
		return results.find((x) => x.id === id) ?? null;
	}

	async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const id = crypto.randomUUID();
		const newValue = { id, ...value } as T;
		this.mutate(ctx, (values) => [...values, newValue]);
		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		this.mutate(ctx, (values) => values.filter((x) => x.id !== id));
		return true;
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		const result = await this.getById(id, ctx);
		return result != null;
	}

	clear(): Promise<void> {
		this.storage().removeItem(this.key);
		return Promise.resolve();
	}
}

const keyValueSchema = z.record(z.string(), z.any());

type AnyRecord = Record<string, unknown>;

class KeyValueLocalStorage implements KeyValueStorage {
	private mutex = new Mutex();

	constructor(
		readonly localKey: string,
		private readonly storage: StorageProvider
	) {}

	getData() {
		const key = this.localKey;
		const storage = this.storage();

		try {
			const raw = storage.getItem(key);
			if (raw == null) {
				return {};
			}

			const json = JSON.parse(raw);
			const result = keyValueSchema.parse(json);
			return result;
		} catch (err) {
			console.error(err);
			return {};
		}
	}

	async mutate<T>(updater: (prevValue: AnyRecord) => T) {
		const key = this.localKey;
		const storage = this.storage();

		return await this.mutex.run(async () => {
			const data = this.getData();
			const result = updater(data);
			storage.setItem(key, JSON.stringify(data));
			return result;
		});
	}

	async set(key: string, value: unknown): Promise<void> {
		await this.mutate((obj) => {
			obj[key] = value;
		});
	}

	delete(key: string): Promise<boolean> {
		return this.mutate((obj) => {
			if (obj[key] === undefined) {
				return false;
			}

			delete obj[key];
			return true;
		});
	}

	get(key: string): Promise<unknown> {
		const data = this.getData();
		return data[key];
	}

	getAll(): Promise<unknown[]> {
		const result = Object.values(this.getData());
		return Promise.resolve(result);
	}
}
