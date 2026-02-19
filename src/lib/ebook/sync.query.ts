import { get } from 'idb-keyval'
import type { BookSyncEntry } from './sync.types'
import { SYNC_TABLE_KEY } from './storage.utils'

export async function getAllSyncEntries(): Promise<BookSyncEntry[]> {
  const entries = await get<BookSyncEntry[]>(SYNC_TABLE_KEY)
  return entries ?? []
}

export async function getBookSyncEntry(bookId: string): Promise<BookSyncEntry | null> {
  const entries = await getAllSyncEntries()
  return entries.find((e) => e.bookId === bookId) ?? null
}
