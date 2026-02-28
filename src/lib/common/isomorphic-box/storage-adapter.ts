import type { ZodType } from 'zod';
import type { BaseModel } from './types';

export type StorageAdapterContext<T> = {
	schema: ZodType<T>;
};

export abstract class StorageAdapter<T extends BaseModel> {
	abstract getAll(ctx: StorageAdapterContext<T>): Promise<T[]>;
	abstract get(id: string, ctx: StorageAdapterContext<T>): Promise<T | null>;
	abstract set(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T>;
	abstract update(value: T, ctx: StorageAdapterContext<T>): Promise<T>;
	abstract remove(id: string, ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract has(id: string, ctx: StorageAdapterContext<T>): Promise<boolean>;
	abstract clear(ctx: StorageAdapterContext<T>): Promise<void>;
}
