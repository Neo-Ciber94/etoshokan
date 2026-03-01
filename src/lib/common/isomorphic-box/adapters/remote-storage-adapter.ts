import { StorageAdapter } from '../storage-adapter';
import type { BaseModel } from '../types';

type RemoteStorageAdapterOptions<T extends BaseModel> = {
	getAll: () => Promise<T[]>;
	get: (id: string) => Promise<T | null>;
	create: (value: Omit<T, 'id'>) => Promise<T>;
	update: (value: T) => Promise<T>;
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
		return this.options.create(value);
	}

	async update(value: T): Promise<T> {
		return this.options.update(value);
	}

	async remove(id: string): Promise<boolean> {
		return this.options.remove(id);
	}

	async has(id: string): Promise<boolean> {
		return (await this.get(id)) != null;
	}

	async clear(): Promise<void> {
		if (this.options.clear) {
			await this.options.clear();
		}
	}
}
