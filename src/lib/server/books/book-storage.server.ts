import {
	type BookMetadata,
	type StoredBook,
	BookMetadataSchema,
	UploadBookFormDataSchema
} from '$lib/ebook/types';
import { getGoogleAuthToken } from '$lib/server/auth/utils';
import { z } from 'zod/v4';

const DriveBookProgressSchema = z.object({
	id: z.string(),
	cfi: z.string(),
	progress: z.number()
});

const DriveBookZoomSchema = z.object({
	id: z.string(),
	zoom: z.number()
});

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'etoshokan-data';
const EBOOKS_FOLDER_NAME = 'ebooks';
const METADATA_FILE_NAME = 'ebook-data.json';

// --- Public API ---

export async function getDriveBooksMetadata(): Promise<BookMetadata[]> {
	const token = await getAccessToken();
	return readDriveMetadataFile(token);
}

export async function getDriveBookMetadataById(bookId: string): Promise<BookMetadata | null> {
	const metadata = await getDriveBooksMetadata();
	return metadata.find((b) => b.id === bookId) ?? null;
}

export async function getDriveBookData(id: string): Promise<ArrayBuffer | undefined> {
	const token = await getAccessToken();
	const ebooksFolder = await getEbooksFolderId(token);
	const fileId = await findFileByName(token, `${id}.epub`, ebooksFolder);

	if (!fileId) {
		return undefined;
	}

	const res = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`, token);
	return await res.arrayBuffer();
}

export async function saveBookToDrive(book: StoredBook): Promise<void> {
	const token = await getAccessToken();
	const ebooksFolder = await getEbooksFolderId(token);

	// Upload/update the book file
	const existingFileId = await findFileByName(token, `${book.metadata.id}.epub`, ebooksFolder);

	if (existingFileId) {
		await driveRequest(`${DRIVE_UPLOAD_API}/files/${existingFileId}?uploadType=media`, token, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/epub+zip' },
			body: book.file
		});
	} else {
		const metadata = JSON.stringify({
			name: `${book.metadata.id}.epub`,
			parents: [ebooksFolder]
		});

		const boundary = 'etoshokan_upload';
		const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
		const closingBoundary = `\r\n--${boundary}--`;

		const metaBytes = new TextEncoder().encode(metaPart);
		const filePart = new TextEncoder().encode(
			`--${boundary}\r\nContent-Type: application/epub+zip\r\nContent-Transfer-Encoding: binary\r\n\r\n`
		);
		const closingBytes = new TextEncoder().encode(closingBoundary);

		const body = new Uint8Array(
			metaBytes.length + filePart.length + book.file.byteLength + closingBytes.length
		);
		body.set(metaBytes, 0);
		body.set(filePart, metaBytes.length);
		body.set(new Uint8Array(book.file), metaBytes.length + filePart.length);
		body.set(closingBytes, metaBytes.length + filePart.length + book.file.byteLength);

		await driveRequest(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, token, {
			method: 'POST',
			headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
			body
		});
	}

	// Update metadata list
	const allMetadata = await readDriveMetadataFile(token);
	const existingIndex = allMetadata.findIndex((m) => m.id === book.metadata.id);

	if (existingIndex >= 0) {
		allMetadata[existingIndex] = book.metadata;
	} else {
		allMetadata.push(book.metadata);
	}

	allMetadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
	await writeDriveMetadataFile(token, allMetadata);
}

export async function deleteBookFromDrive(id: string): Promise<void> {
	const token = await getAccessToken();
	const ebooksFolder = await getEbooksFolderId(token);
	const fileId = await findFileByName(token, `${id}.epub`, ebooksFolder);

	if (fileId) {
		await driveRequest(`${DRIVE_API}/files/${fileId}`, token, { method: 'DELETE' });
	}

	const metadata = await readDriveMetadataFile(token);
	const filtered = metadata.filter((m) => m.id !== id);
	await writeDriveMetadataFile(token, filtered);
}

export async function updateDriveBookProgress(
	id: string,
	cfi: string,
	progress: number
): Promise<void> {
	DriveBookProgressSchema.parse({ id, cfi, progress });

	const token = await getAccessToken();
	const metadata = await readDriveMetadataFile(token);
	const book = metadata.find((m) => m.id === id);

	if (book) {
		book.currentCfi = cfi;
		book.progress = progress;
		book.lastReadAt = Date.now();

		metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt));
		await writeDriveMetadataFile(token, metadata);
	}
}

export async function updateDriveBookZoom(id: string, zoom: number): Promise<void> {
	DriveBookZoomSchema.parse({ id, zoom });

	const token = await getAccessToken();
	const metadata = await readDriveMetadataFile(token);
	const book = metadata.find((m) => m.id === id);

	if (book) {
		book.zoom = zoom;
		await writeDriveMetadataFile(token, metadata);
	}
}

export async function uploadBookToDrive(formData: FormData): Promise<BookMetadata> {
	const raw = {
		title: formData.get('title'),
		author: formData.get('author'),
		cover: formData.get('cover') || undefined,
		ebookData: formData.get('ebookData')
	};

	const parsed = UploadBookFormDataSchema.parse(raw);

	const arrayBuffer = await parsed.ebookData.arrayBuffer();
	const bookId = crypto.randomUUID();
	const bookMetadata: BookMetadata = {
		id: bookId,
		title: parsed.title,
		author: parsed.author,
		cover: parsed.cover,
		addedAt: Date.now()
	};

	await saveBookToDrive({
		metadata: bookMetadata,
		file: arrayBuffer
	});

	return bookMetadata;
}

// -- Helpers --

async function getAccessToken(): Promise<string> {
	const authToken = await getGoogleAuthToken();
	if (!authToken?.accessToken) {
		throw new Error('No Google access token available');
	}
	return authToken.accessToken;
}

async function driveRequest(
	url: string,
	token: string,
	options: RequestInit = {}
): Promise<Response> {
	const res = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...options.headers
		}
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Drive API error (${res.status}): ${body}`);
	}

	return res;
}

// --- Folder helpers ---

async function findFileByName(
	token: string,
	name: string,
	parentId?: string,
	mimeType?: string
): Promise<string | null> {
	const q = [
		`name='${name}'`,
		'trashed=false',
		...(parentId ? [`'${parentId}' in parents`] : []),
		...(mimeType ? [`mimeType='${mimeType}'`] : [])
	].join(' and ');

	const res = await driveRequest(
		`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
		token
	);

	const data: { files: { id: string; name: string }[] } = await res.json();
	return data.files[0]?.id ?? null;
}

async function getOrCreateFolder(token: string, name: string, parentId?: string): Promise<string> {
	const existing = await findFileByName(
		token,
		name,
		parentId,
		'application/vnd.google-apps.folder'
	);

	if (existing) {
		return existing;
	}

	const res = await driveRequest(`${DRIVE_API}/files`, token, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name,
			mimeType: 'application/vnd.google-apps.folder',
			...(parentId ? { parents: [parentId] } : {})
		})
	});

	const folder: { id: string } = await res.json();
	return folder.id;
}

async function getRootFolderId(token: string): Promise<string> {
	return getOrCreateFolder(token, FOLDER_NAME);
}

async function getEbooksFolderId(token: string): Promise<string> {
	const rootId = await getRootFolderId(token);
	return getOrCreateFolder(token, EBOOKS_FOLDER_NAME, rootId);
}

// --- Metadata helpers ---

async function getDriveMetadataFileId(token: string): Promise<string | null> {
	const rootId = await getRootFolderId(token);
	return findFileByName(token, METADATA_FILE_NAME, rootId);
}

async function readDriveMetadataFile(token: string): Promise<BookMetadata[]> {
	const fileId = await getDriveMetadataFileId(token);
	if (!fileId) {
		return [];
	}

	const res = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`, token);
	const data = await res.json();
	return z.array(BookMetadataSchema).parse(data);
}

async function writeDriveMetadataFile(token: string, metadata: BookMetadata[]): Promise<void> {
	const rootId = await getRootFolderId(token);
	const fileId = await getDriveMetadataFileId(token);
	const body = JSON.stringify(metadata);

	if (fileId) {
		// Update existing file
		await driveRequest(`${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`, token, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body
		});
	} else {
		// Create new file with multipart upload
		const metadataPart = JSON.stringify({
			name: METADATA_FILE_NAME,
			parents: [rootId]
		});

		const boundary = 'etoshokan_boundary';
		const multipartBody = [
			`--${boundary}\r\n`,
			'Content-Type: application/json; charset=UTF-8\r\n\r\n',
			metadataPart,
			`\r\n--${boundary}\r\n`,
			'Content-Type: application/json\r\n\r\n',
			body,
			`\r\n--${boundary}--`
		].join('');

		await driveRequest(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, token, {
			method: 'POST',
			headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
			body: multipartBody
		});
	}
}
