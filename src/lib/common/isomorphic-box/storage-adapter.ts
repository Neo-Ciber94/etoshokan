import type { ZodType } from 'zod';
import type { HasId } from './types';

export type StorageAdapterContext<T> = {
	schema: ZodType<T>;
};

export interface KeyValueStorage {
	set(key: string, value: unknown): Promise<void>;
	get(key: string): Promise<unknown>;
	delete(key: string): Promise<boolean>;
	getAll(): Promise<unknown[]>;
}

export abstract class StorageAdapter<T extends HasId> {
	abstract readonly local: KeyValueStorage;
	abstract getAll(ctx: StorageAdapterContext<T>): Promise<T[]>;
	abstract getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null>;
	abstract add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T>;
	abstract remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract clear(ctx: StorageAdapterContext<T>): Promise<void>;
}

export class NoopKeyValueStorage implements KeyValueStorage {
	set(): Promise<void> {
		return Promise.resolve();
	}

	get(): Promise<unknown> {
		return Promise.resolve();
	}

	delete(): Promise<boolean> {
		return Promise.resolve(false);
	}

	getAll(): Promise<unknown[]> {
		return Promise.resolve([]);
	}
}
