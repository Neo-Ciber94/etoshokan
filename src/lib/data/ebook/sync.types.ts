export type UploadState = 'pending' | 'uploaded' | 'missing';
export type SyncState = 'pending' | 'synced';

export interface BookSyncEntry {
	bookId: string;
	uploadState: UploadState;
	syncState: SyncState;
}
