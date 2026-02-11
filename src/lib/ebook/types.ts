export interface BookMetadata {
	id: string;
	title: string;
	author: string;
	cover?: string;
	addedAt: number;
	lastReadAt?: number;
	currentCfi?: string; // Current location in the book
	progress?: number; // Reading progress percentage
	zoom?: number; // Zoom level percentage (100-200)
}

export interface StoredBook {
	metadata: BookMetadata;
	file: ArrayBuffer;
}

export interface TocItem {
	label: string;
	href: string;
	subitems?: TocItem[];
}
