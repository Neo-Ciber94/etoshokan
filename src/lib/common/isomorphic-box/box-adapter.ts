import type { ZodType } from 'zod';
import type { HasId } from './types';

export type BoxAdapterContext<T> = {
	schema: ZodType<T>;
};

export abstract class BoxAdapter<T extends HasId> {
	abstract getAll(ctx: BoxAdapterContext<T>): Promise<T[]>;
	abstract getById(id: T['id'], ctx: BoxAdapterContext<T>): Promise<T | null>;
	abstract add(value: Omit<T, 'id'>, ctx: BoxAdapterContext<T>): Promise<T>;
	abstract remove(id: T['id'], ctx: BoxAdapterContext<T>): Promise<boolean>;
	abstract has(id: T['id'], ctx: BoxAdapterContext<T>): Promise<boolean>;
	abstract clear(ctx: BoxAdapterContext<T>): Promise<void>;
}
