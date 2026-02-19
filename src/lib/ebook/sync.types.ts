export type UploadState = 'pending' | 'uploaded'
export type SyncState = 'pending' | 'synced'

export interface BookSyncEntry {
  bookId: string
  uploadState: UploadState
  syncState: SyncState
}
