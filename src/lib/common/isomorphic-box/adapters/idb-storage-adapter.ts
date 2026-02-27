import z from 'zod';
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { HasId } from '../types';

type IDBConfig = {
	dbName: string;
	storeName: string;
	version?: number;
};

export class IndexedDbAdapter<T extends HasId> extends StorageAdapter<T> {
	private dbPromise: Promise<IDBDatabase>;

	constructor(readonly config: IDBConfig) {
		super();
		this.dbPromise = this.openDb();
	}

	private openDb(): Promise<IDBDatabase> {
		const { dbName, storeName, version = 1 } = this.config;

		return new Promise((resolve, reject) => {
			const req = indexedDB.open(dbName, version);

			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, { keyPath: 'id' });
				}
			};

			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	private async withStore<R>(
		mode: IDBTransactionMode,
		fn: (store: IDBObjectStore) => R | Promise<R>
	): Promise<R> {
		const db = await this.dbPromise;

		return new Promise<R>((resolve, reject) => {
			const tx = db.transaction(this.config.storeName, mode);
			const store = tx.objectStore(this.config.storeName);

			Promise.resolve(fn(store))
				.then((result) => {
					tx.oncomplete = () => resolve(result);
				})
				.catch(reject);

			tx.onerror = () => reject(tx.error);
		});
	}

	getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		return this.withStore('readonly', (store) => {
			return new Promise<T[]>((resolve) => {
				const req = store.getAll();

				req.onsuccess = () => {
					try {
						resolve(z.array(ctx.schema).parse(req.result));
					} catch (err) {
						console.error(err);
						resolve([]);
					}
				};
			});
		});
	}

	getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		return this.withStore('readonly', (store) => {
			return new Promise<T | null>((resolve) => {
				const req = store.get(id);

				req.onsuccess = () => {
					if (!req.result) {
						resolve(null);
						return;
					}

					try {
						resolve(ctx.schema.parse(req.result));
					} catch (err) {
						console.error(err);
						resolve(null);
					}
				};
			});
		});
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		return (await this.getById(id, ctx)) != null;
	}

	async add(value: Omit<T, 'id'>): Promise<T> {
		const newValue = { id: crypto.randomUUID(), ...value } as T;

		await this.withStore('readwrite', (store) => {
			store.put(newValue);
		});

		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		await this.withStore('readwrite', (store) => {
			store.delete(id);
		});

		return true;
	}

	clear(): Promise<void> {
		return this.withStore('readwrite', (store) => {
			store.clear();
		});
	}
}
