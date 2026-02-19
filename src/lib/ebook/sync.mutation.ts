import { set } from 'idb-keyval'
import type { UploadState, SyncState, BookSyncEntry } from './sync.types'
import { getBooksMetadata, getBookData } from '$lib/remote/ebook.remote'
import { getAllSyncEntries, getBookSyncEntry } from './sync.query'
import { getLocalBookMetadataById } from './books.query'
import { saveLocalBook, mergeLocalBooksMetadata } from './books.mutation'
import { SYNC_TABLE_KEY } from './storage.utils'

async function upsertSyncEntry(entry: BookSyncEntry): Promise<void> {
  const entries = await getAllSyncEntries()
  const index = entries.findIndex((e) => e.bookId === entry.bookId)
  if (index >= 0) {
    entries[index] = entry
  } else {
    entries.push(entry)
  }
  await set(SYNC_TABLE_KEY, entries)
}

export async function setBookUploadState(bookId: string, uploadState: UploadState): Promise<void> {
  const existing = await getBookSyncEntry(bookId)
  await upsertSyncEntry({
    bookId,
    uploadState,
    syncState: existing?.syncState ?? 'synced'
  })
}

export async function setBookSyncState(bookId: string, syncState: SyncState): Promise<void> {
  const existing = await getBookSyncEntry(bookId)
  await upsertSyncEntry({
    bookId,
    uploadState: existing?.uploadState ?? 'uploaded',
    syncState
  })
}

export async function removeBookSyncEntry(bookId: string): Promise<void> {
  const entries = await getAllSyncEntries()
  await set(SYNC_TABLE_KEY, entries.filter((e) => e.bookId !== bookId))
}

// Fetches remote metadata and saves it locally for books not already present (no book file data)
export async function syncRemoteMetadata(): Promise<void> {
  const result = await getBooksMetadata()
  if (!result.success) {
    console.error('Failed to fetch remote metadata:', result.error)
    return
  }

  await mergeLocalBooksMetadata(result.metadata)
}

// Downloads book file data from server and saves it to IndexDB
export async function downloadBookData(bookId: string): Promise<void> {
  const result = await getBookData({ id: bookId })
  if (!result.success) {
    console.error('Failed to download book data:', result.error)
    return
  }

  if (!result.data) {
    console.error('No book data returned from server for book:', bookId)
    return
  }

  const metadata = await getLocalBookMetadataById(bookId)
  if (!metadata) {
    console.error('No local metadata found for book:', bookId)
    return
  }

  await saveLocalBook({ metadata, file: result.data })
}
