export interface BookMetadata {
	id: string;
	title: string;
	author: string;
	cover?: string;
	addedAt: number;
	lastReadAt?: number;
	currentCfi?: string; // Current location in the book
	progress?: number; // Reading progress percentage
}

export interface StoredBook {
	metadata: BookMetadata;
	file: ArrayBuffer;
}
