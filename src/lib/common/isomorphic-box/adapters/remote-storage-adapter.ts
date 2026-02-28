import { StorageAdapter } from '../storage-adapter';
import type { BaseModel } from '../types';

type RemoteStorageAdapterOptions<T extends BaseModel> = {
	getAll: () => Promise<T[]>;
	getById: (id: string) => Promise<T | null>;
	create: (input: Omit<T, 'id'>) => Promise<T>;
	remove: (id: string) => Promise<boolean>;
	clear?: () => Promise<void>;
};

export class RemoteStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	constructor(readonly options: RemoteStorageAdapterOptions<T>) {
		super();
	}

	async getAll(): Promise<T[]> {
		const result = await this.options.getAll();
		return result;
	}

	async getById(id: T['id']): Promise<T | null> {
		const result = await this.options.getById(id);
		return result;
	}

	async add(value: Omit<T, 'id'>): Promise<T> {
		const result = await this.options.create(value);
		return result;
	}

	async remove(id: T['id']): Promise<boolean> {
		const result = await this.options.remove(id);
		return result;
	}

	async has(id: T['id']): Promise<boolean> {
		const result = await this.getById(id);
		return result != null;
	}

	async clear(): Promise<void> {
		if (this.options.clear) {
			await this.options.clear();
		}
	}
}
