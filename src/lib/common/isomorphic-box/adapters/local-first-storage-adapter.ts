import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { BaseModel } from '../types';
import { createIndexDbStore, type IndexDbStore } from './idb-store';
import { defu } from 'defu';

type PendingPayload<T extends BaseModel> =
	| { type: 'set'; localId: string; value: Omit<T, 'id'> }
	| { type: 'put'; value: T }
	| { type: 'remove'; id: string }
	| { type: 'clear' };

type PendingOperation<T extends BaseModel> = PendingPayload<T> & {
	operationId: string;
	timestamp: number;
};

type LocalFirstStorageAdapterOptions<T extends BaseModel> = {
	key: string;
	isOnline: () => Promise<boolean>;
	localStorage: StorageAdapter<T>;
	remoteStorage: StorageAdapter<T>;
};

type OnPushChanges<T extends BaseModel> = (entries: ReadonlyArray<PendingOperation<T>>) => void;
type OnPullChanges<T extends BaseModel> = (entries: ReadonlyArray<T>) => void;

export class LocalFirstStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	private readonly options: Readonly<LocalFirstStorageAdapterOptions<T>>;
	private readonly pendingStore: IndexDbStore<PendingOperation<T>>;

	constructor(options: Readonly<LocalFirstStorageAdapterOptions<T>>) {
		super();
		this.options = options;
		this.pendingStore = createIndexDbStore<PendingOperation<T>>(`lf-${options.key}`, 'pending');
	}

	private async enqueue(payload: PendingPayload<T>): Promise<void> {
		const operationId = crypto.randomUUID();
		const timestamp = Date.now();
		await this.pendingStore.set(operationId, {
			operationId,
			timestamp,
			...payload
		} as PendingOperation<T>);
	}

	async hasPending(): Promise<boolean> {
		const keys = await this.pendingStore.keys();
		return keys.length > 0;
	}

	private async deduplicateEntries() {
		const entries = await this.pendingStore.entries();
		const sorted = entries.map(([, op]) => op).sort((a, b) => a.timestamp - b.timestamp);
		let flatten: PendingOperation<T>[] = [];

		for (const op of sorted) {
			switch (op.type) {
				case 'clear':
				case 'set':
				case 'remove':
					flatten.push(op);
					break;

				// We only deduplicate all the put operations
				case 'put':
					{
						const exists = flatten.some((x) => x.type === 'put' && x.value.id === op.value.id);

						if (exists) {
							// We merge all the puts
							flatten = flatten.map((prevOp) => {
								if (prevOp.type === 'put' && prevOp.value.id === op.value.id) {
									return defu(op, prevOp);
								}

								return prevOp;
							});
						} else {
							flatten.push(op);
						}
					}
					break;
			}
		}

		// Replace all
		await this.pendingStore.clear();
		const promises: Promise<void>[] = [];

		for (const op of flatten) {
			const pendingPromise = this.pendingStore.set(op.operationId, op);
			promises.push(pendingPromise);
		}

		await Promise.all(promises);
	}

	async pushChanges(
		ctx: StorageAdapterContext<T>,
		onPushChanges?: OnPushChanges<T>
	): Promise<void> {
		await this.deduplicateEntries();
		const entries = await this.pendingStore.entries();
		const sorted = entries.map(([, op]) => op).sort((a, b) => a.timestamp - b.timestamp);

		for (const op of sorted) {
			try {
				if (op.type === 'set') {
					const remoteItem = await this.options.remoteStorage.set(op.value, ctx);
					await this.options.localStorage.update(remoteItem, ctx);
					await this.options.localStorage.remove(op.localId, ctx);
				} else if (op.type === 'put') {
					await this.options.remoteStorage.update(op.value, ctx);
				} else if (op.type === 'remove') {
					await this.options.remoteStorage.remove(op.id, ctx);
				} else if (op.type === 'clear') {
					await this.options.remoteStorage.clear(ctx);
				}
				await this.pendingStore.delete(op.operationId);
			} catch (err) {
				console.error(
					`LocalFirstStorageAdapter.pushChanges: failed on operation ${op.operationId}`,
					err
				);
				break;
			}
		}

		onPushChanges?.(sorted);
	}

	async pullChanges(
		ctx: StorageAdapterContext<T>,
		onPullChanges?: OnPullChanges<T>
	): Promise<void> {
		const items = await this.options.remoteStorage.getAll(ctx);
		await this.options.localStorage.clear(ctx);

		for (const item of items) {
			await this.options.localStorage.update(item, ctx);
		}

		onPullChanges?.(items);
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		return this.options.localStorage.getAll(ctx);
	}

	get(id: string, ctx: StorageAdapterContext<T>): Promise<T | null> {
		return this.options.localStorage.get(id, ctx);
	}

	has(id: string, ctx: StorageAdapterContext<T>): Promise<boolean> {
		return this.options.localStorage.has(id, ctx);
	}

	async set(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const online = await this.options.isOnline();

		if (online) {
			try {
				const remoteItem = await this.options.remoteStorage.set(value, ctx);
				await this.options.localStorage.update(remoteItem, ctx);
				return remoteItem;
			} catch (err) {
				console.error('LocalFirstStorageAdapter.set: remote failed, falling back to local', err);
			}
		}

		const localItem = await this.options.localStorage.set(value, ctx);
		await this.enqueue({ type: 'set', localId: localItem.id, value });
		return localItem;
	}

	async update(value: T, ctx: StorageAdapterContext<T>): Promise<T> {
		const result = await this.options.localStorage.update(value, ctx);

		const online = await this.options.isOnline();
		if (online) {
			try {
				await this.options.remoteStorage.update(value, ctx);
				return result;
			} catch (err) {
				console.error('LocalFirstStorageAdapter.put: remote failed, queuing pending', err);
			}
		}

		await this.enqueue({ type: 'put', value });
		return result;
	}

	async remove(id: string, ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		await this.options.localStorage.remove(id, ctx);

		const online = await this.options.isOnline();
		if (online) {
			try {
				await this.options.remoteStorage.remove(id, ctx);
				return true;
			} catch (err) {
				console.error('LocalFirstStorageAdapter.remove: remote failed, queuing pending', err);
			}
		}

		await this.enqueue({ type: 'remove', id });
		return true;
	}

	async clear(ctx: StorageAdapterContext<T>): Promise<void> {
		await this.options.localStorage.clear(ctx);

		const online = await this.options.isOnline();
		if (online) {
			try {
				await this.options.remoteStorage.clear(ctx);
				return;
			} catch (err) {
				console.error('LocalFirstStorageAdapter.clear: remote failed, queuing pending', err);
			}
		}

		await this.enqueue({ type: 'clear' });
	}
}
