import z from 'zod';
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { BaseModel } from '../types';

type StorageProvider = () => Storage;

export class LocalStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	private storage: StorageProvider;

	constructor(
		readonly key: string,
		storage?: StorageProvider
	) {
		super();
		this.storage = storage ?? (() => localStorage);
	}

	private getJson(ctx: StorageAdapterContext<T>) {
		const key = this.key;
		const storage = this.storage();
		const raw = storage.getItem(key);

		if (raw == null) {
			return {} as Record<string, T>;
		}

		const result = z.record(z.string(), ctx.schema).parse(JSON.parse(raw));
		return result;
	}

	private mutate(
		ctx: StorageAdapterContext<T>,
		updater: (values: Record<string, T>) => Record<string, T>
	) {
		const key = this.key;
		const storage = this.storage();

		try {
			const value = this.getJson(ctx);
			const result = updater(value);
			storage.setItem(key, JSON.stringify(result));
		} catch (err) {
			console.error(err);
			const result = updater({});
			storage.setItem(key, JSON.stringify(result));
		}
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		try {
			const result = this.getJson(ctx);
			return Promise.resolve(Object.values(result));
		} catch (err) {
			console.error(err);
			return Promise.resolve([]);
		}
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		const record = this.getJson(ctx);
		return record[id] ?? null;
	}

	async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const id = crypto.randomUUID();
		const newValue = { id, ...value } as T;
		this.mutate(ctx, (values) => ({ ...values, [id]: newValue }));
		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		this.mutate(ctx, (obj) => {
			delete obj[id];
			return obj;
		});

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
