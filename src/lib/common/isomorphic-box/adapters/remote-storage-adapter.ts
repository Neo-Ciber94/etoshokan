import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { BaseModel } from '../types';

type RemoteStorageAdapterOptions<T extends BaseModel> = {
	getAll: () => Promise<T[]>;
	get: (id: string) => Promise<T | null>;
	set: (value: Omit<T, 'id'>) => Promise<T>;
	put?: (value: T) => Promise<T>;
	remove: (id: string) => Promise<boolean>;
	clear?: () => Promise<void>;
};

export class RemoteStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	constructor(readonly options: RemoteStorageAdapterOptions<T>) {
		super();
	}

	async getAll(): Promise<T[]> {
		return this.options.getAll();
	}

	async get(id: string): Promise<T | null> {
		return this.options.get(id);
	}

	async set(value: Omit<T, 'id'>): Promise<T> {
		return this.options.set(value);
	}

	async update(value: T): Promise<T> {
		if (this.options.put) {
			return this.options.put(value);
		}
		const { id: _id, ...rest } = value as BaseModel & Omit<T, 'id'>;
		return this.options.set(rest as Omit<T, 'id'>);
	}

	async remove(id: string): Promise<boolean> {
		return this.options.remove(id);
	}

	async has(id: string): Promise<boolean> {
		return (await this.get(id)) != null;
	}

	async clear(_ctx: StorageAdapterContext<T>): Promise<void> {
		if (this.options.clear) {
			await this.options.clear();
		}
	}
}
