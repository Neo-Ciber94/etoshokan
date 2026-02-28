import z from 'zod'
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter'
import type { BaseModel } from '../types'
import { createIndexDbStore, type IndexDbStore } from './idb-store'

type PendingPayload<T extends BaseModel> =
	| { type: 'add'; value: Omit<T, 'id'> }
	| { type: 'remove'; id: string }
	| { type: 'clear' }

type PendingOperation<T extends BaseModel> = PendingPayload<T> & {
	opId: string
	seq: number
}

type LocalFirstStorageAdapterOptions<T extends BaseModel> = {
	key: string
	isOnline: () => Promise<boolean>
	remoteStorage: StorageAdapter<T>
}

export class LocalFirstStorageAdapter<T extends BaseModel> extends StorageAdapter<T> {
	private readonly options: Readonly<LocalFirstStorageAdapterOptions<T>>
	private readonly dataStore: IndexDbStore<T>
	private readonly pendingStore: IndexDbStore<PendingOperation<T>>

	constructor(options: Readonly<LocalFirstStorageAdapterOptions<T>>) {
		super()
		this.options = options
		this.dataStore = createIndexDbStore<T>(`lf-${options.key}`, 'data')
		this.pendingStore = createIndexDbStore<PendingOperation<T>>(`lf-${options.key}`, 'pending')
	}

	private async enqueue(payload: PendingPayload<T>): Promise<void> {
		const opId = crypto.randomUUID()
		const seq = Date.now()
		await this.pendingStore.set(opId, { opId, seq, ...payload } as PendingOperation<T>)
	}

	async hasPending(): Promise<boolean> {
		const keys = await this.pendingStore.keys()
		return keys.length > 0
	}

	async pushChanges(ctx: StorageAdapterContext<T>): Promise<void> {
		const entries = await this.pendingStore.entries()
		const sorted = entries.map(([, op]) => op).sort((a, b) => a.seq - b.seq)

		for (const op of sorted) {
			try {
				if (op.type === 'add') {
					await this.options.remoteStorage.add(op.value, ctx)
				} else if (op.type === 'remove') {
					await this.options.remoteStorage.remove(op.id, ctx)
				} else if (op.type === 'clear') {
					await this.options.remoteStorage.clear(ctx)
				}
				await this.pendingStore.delete(op.opId)
			} catch (err) {
				console.error(`LocalFirstStorageAdapter.pushChanges: failed on operation ${op.opId}`, err)
				break
			}
		}
	}

	async pullChanges(ctx: StorageAdapterContext<T>): Promise<void> {
		const items = await this.options.remoteStorage.getAll(ctx)
		await this.dataStore.clear()
		for (const item of items) {
			await this.dataStore.set(item.id, item)
		}
	}

	async getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		try {
			const items = await this.dataStore.values()
			return z.array(ctx.schema).parse(items)
		} catch (err) {
			console.error(err)
			return []
		}
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		try {
			const item = await this.dataStore.get(id)
			if (item === undefined) {
				return null
			}
			return ctx.schema.parse(item)
		} catch (err) {
			console.error(err)
			return null
		}
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		return (await this.getById(id, ctx)) != null
	}

	async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const online = await this.options.isOnline()

		if (online) {
			try {
				const remote = await this.options.remoteStorage.add(value, ctx)
				await this.dataStore.set(remote.id, remote)
				return remote
			} catch (err) {
				console.error('LocalFirstStorageAdapter.add: remote failed, falling back to local', err)
			}
		}

		const id = crypto.randomUUID()
		const newValue = { id, ...value } as T
		await this.dataStore.set(id, newValue)
		await this.enqueue({ type: 'add', value })
		return newValue
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false
		}

		await this.dataStore.delete(id)

		const online = await this.options.isOnline()
		if (online) {
			try {
				await this.options.remoteStorage.remove(id, ctx)
				return true
			} catch (err) {
				console.error('LocalFirstStorageAdapter.remove: remote failed, queuing pending', err)
			}
		}

		await this.enqueue({ type: 'remove', id })
		return true
	}

	async clear(ctx: StorageAdapterContext<T>): Promise<void> {
		await this.dataStore.clear()

		const online = await this.options.isOnline()
		if (online) {
			try {
				await this.options.remoteStorage.clear(ctx)
				return
			} catch (err) {
				console.error('LocalFirstStorageAdapter.clear: remote failed, queuing pending', err)
			}
		}

		await this.enqueue({ type: 'clear' })
	}
}
