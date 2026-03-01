import { describe, it, expect, vi, beforeEach } from 'vitest'
import z from 'zod'
import { createCollection } from '../collection'
import { IndexedDbStorageAdapter } from './idb-storage-adapter'

const { mockStores } = vi.hoisted(() => {
  const mockStores = new Map<string, Map<string, unknown>>()
  return { mockStores }
})

vi.mock('idb-keyval', () => ({
  createStore: (dbName: string, storeName: string) => `${dbName}:${storeName}`,
  get: (key: string, storeKey: string) =>
    Promise.resolve(mockStores.get(storeKey)?.get(key)),
  set: (key: string, value: unknown, storeKey: string) => {
    if (!mockStores.has(storeKey)) {
      mockStores.set(storeKey, new Map())
    }
    mockStores.get(storeKey)!.set(key, value)
    return Promise.resolve()
  },
  del: (key: string, storeKey: string) => {
    mockStores.get(storeKey)?.delete(key)
    return Promise.resolve()
  },
  values: (storeKey: string) =>
    Promise.resolve([...(mockStores.get(storeKey)?.values() ?? [])]),
  clear: (storeKey: string) => {
    mockStores.get(storeKey)?.clear()
    return Promise.resolve()
  },
}))

const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
})
type Note = z.infer<typeof NoteSchema>

const noteCollection = createCollection({
  schema: NoteSchema,
  methods: (ctx) => ({
    create: (data: Omit<Note, 'id'>) => ctx.adapter.set(data, ctx),
    findById: (id: string) => ctx.adapter.get(id, ctx),
    findAll: () => ctx.adapter.getAll(ctx),
    update: (item: Note) => ctx.adapter.update(item, ctx),
    remove: (id: string) => ctx.adapter.remove(id, ctx),
    has: (id: string) => ctx.adapter.has(id, ctx),
  }),
})

describe('IndexedDbStorageAdapter', () => {
  let store: ReturnType<typeof noteCollection.adapt>

  beforeEach(() => {
    mockStores.clear()
    store = noteCollection.adapt(
      new IndexedDbStorageAdapter({ dbName: 'test-db', storeName: 'notes' }),
    )
  })

  it('creates an item and returns it with an id', async () => {
    const created = await store.create({ title: 'First', body: 'Hello' })

    expect(created.id).toBeTruthy()
    expect(created.title).toBe('First')
    expect(created.body).toBe('Hello')
  })

  it('retrieves a created item by id', async () => {
    const created = await store.create({ title: 'Second', body: 'World' })
    const found = await store.findById(created.id)

    expect(found).toEqual(created)
  })

  it('returns null for a non-existent id', async () => {
    const found = await store.findById('does-not-exist')

    expect(found).toBeNull()
  })

  it('returns all stored items', async () => {
    await store.create({ title: 'A', body: 'body-a' })
    await store.create({ title: 'B', body: 'body-b' })

    const all = await store.findAll()

    expect(all).toHaveLength(2)
    expect(all.map((n) => n.title)).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('returns an empty array when store is empty', async () => {
    const all = await store.findAll()

    expect(all).toEqual([])
  })

  it('updates an existing item', async () => {
    const created = await store.create({ title: 'Old', body: 'old body' })
    const updated = await store.update({ ...created, title: 'New', body: 'new body' })

    expect(updated.title).toBe('New')
    expect(updated.body).toBe('new body')

    const found = await store.findById(created.id)
    expect(found?.title).toBe('New')
  })

  it('removes an existing item and returns true', async () => {
    const created = await store.create({ title: 'ToDelete', body: 'bye' })
    const result = await store.remove(created.id)

    expect(result).toBe(true)
    expect(await store.findById(created.id)).toBeNull()
  })

  it('returns false when removing a non-existent item', async () => {
    const result = await store.remove('ghost-id')

    expect(result).toBe(false)
  })

  it('checks existence of items correctly', async () => {
    const created = await store.create({ title: 'Exists', body: 'yes' })

    expect(await store.has(created.id)).toBe(true)
    expect(await store.has('nope')).toBe(false)
  })
})
