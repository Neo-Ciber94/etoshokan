import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { BaseModel } from '../types';

type LocalFirstStorageAdapterOptions<T extends BaseModel> = {
	key: string;
	isOnline: () => Promise<boolean>;
	remoteStorage: StorageAdapter<T>;
	localStorage: StorageAdapter<T>;
};

export class LocalFirstStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	constructor(options: Readonly<LocalFirstStorageAdapterOptions<T>>) {
		super();
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		throw new Error('Method not implemented.');
	}
	getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		throw new Error('Method not implemented.');
	}
	add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		throw new Error('Method not implemented.');
	}
	remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		throw new Error('Method not implemented.');
	}
	clear(ctx: StorageAdapterContext<T>): Promise<void> {
		throw new Error('Method not implemented.');
	}
}
