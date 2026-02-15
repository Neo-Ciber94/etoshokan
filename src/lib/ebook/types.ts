import { z } from 'zod/v4';

export const BookMetadataSchema = z.object({
	id: z.string(),
	title: z.string(),
	author: z.string(),
	cover: z.string().optional(),
	addedAt: z.number(),
	lastReadAt: z.number().optional(),
	currentCfi: z.string().optional(), // Current location in the book
	progress: z.number().optional(), // Reading progress percentage
	zoom: z.number().optional() // Zoom level percentage (100-200)
});

export type BookMetadata = z.infer<typeof BookMetadataSchema>;

export const StoredBookSchema = z.object({
	metadata: BookMetadataSchema,
	file: z.instanceof(ArrayBuffer)
});

export type StoredBook = z.infer<typeof StoredBookSchema>;

export const UploadBookFormDataSchema = z.object({
	title: z.string().min(1),
	author: z.string().min(1),
	cover: z.string().optional(),
	ebookData: z.instanceof(ArrayBuffer)
});

export type UploadBookFormData = z.infer<typeof UploadBookFormDataSchema>;

export interface TocItem {
	label: string;
	href: string;
	subitems?: TocItem[];
}
