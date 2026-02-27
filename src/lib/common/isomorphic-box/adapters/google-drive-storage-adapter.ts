import z from 'zod';
import { StorageAdapter, type StorageAdapterContext } from '../storage-adapter';
import type { HasId } from '../types';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

type GoogleDriveAdapterConfig = {
	/** OAuth 2.0 access token with at least the `drive.file` scope. */
	accessToken: string;
	/** The name of the JSON file to use as the data store (e.g. "my-store.json"). */
	fileName: string;
	/**
	 * The name of the Drive folder to store the file in.
	 * The folder will be created if it does not exist.
	 */
	folderName: string;
};

/**
 * A BoxAdapter backed by a single JSON file on Google Drive.
 *
 * The file is stored at `<folderName>/<fileName>` (or at the root of My Drive
 * when `folderName` is omitted). Both the folder and the file are created
 * automatically on first write if they do not already exist.
 *
 * The entire collection is kept as a flat `{ [id]: record }` map inside the
 * JSON file. Every mutation reads the current state, applies the change, then
 * writes the whole file back.
 *
 * Usage
 * -----
 * ```ts
 * const adapter = new GoogleDriveAdapter<MyRecord>({
 *   accessToken: '<oauth-token>',
 *   fileName: 'my-records.json',
 *   folderName: 'MyAppData',        // optional
 * });
 * ```
 */
export class GoogleDriveAdapter<T extends HasId> extends StorageAdapter<T> {
	/** Cached Drive file ID for the JSON store file. */
	private fileIdCache: string | null = null;

	/** Cached Drive folder ID (resolved from `config.folderName`). */
	private folderIdCache: string | null = null;

	constructor(readonly config: GoogleDriveAdapterConfig) {
		super();
	}

	private authHeaders(): HeadersInit {
		return {
			Authorization: `Bearer ${this.config.accessToken}`,
			'Content-Type': 'application/json'
		};
	}

	/**
	 * Resolves the Drive folder ID for `config.folderName`.
	 * If the folder does not exist it is created.
	 * Returns `null` when no `folderName` is configured (use Drive root).
	 */
	private async resolveFolderId(): Promise<string | null> {
		if (!this.config.folderName) {
			return null;
		}

		if (this.folderIdCache) {
			return this.folderIdCache;
		}

		const { folderName } = this.config;

		const q = encodeURIComponent(
			`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
		);

		const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${q}&fields=files(id)&spaces=drive`, {
			headers: this.authHeaders()
		});

		if (!searchRes.ok) {
			throw new Error(`Drive folder search failed: ${searchRes.status} ${searchRes.statusText}`);
		}

		const searchData = (await searchRes.json()) as { files: { id: string }[] };

		if (searchData.files.length > 0) {
			this.folderIdCache = searchData.files[0].id;
			return this.folderIdCache;
		}

		// Folder does not exist – create it
		const createRes = await fetch(DRIVE_FILES_URL, {
			method: 'POST',
			headers: this.authHeaders(),
			body: JSON.stringify({
				name: folderName,
				mimeType: 'application/vnd.google-apps.folder'
			})
		});

		if (!createRes.ok) {
			throw new Error(`Drive folder creation failed: ${createRes.status} ${createRes.statusText}`);
		}

		const created = (await createRes.json()) as { id: string };
		this.folderIdCache = created.id;
		return this.folderIdCache;
	}

	/* ----------------------- File resolution / creation --------------------- */

	/**
	 * Resolves the Drive file ID for `config.fileName` inside the resolved
	 * folder (or root). Returns `null` if the file does not yet exist.
	 */
	private async findFileId(): Promise<string | null> {
		if (this.fileIdCache) {
			return this.fileIdCache;
		}

		const folderId = await this.resolveFolderId();
		const { fileName } = this.config;

		const parentClause = folderId ? `'${folderId}' in parents` : `'root' in parents`;

		const q = encodeURIComponent(`name='${fileName}' and ${parentClause} and trashed=false`);

		const res = await fetch(`${DRIVE_FILES_URL}?q=${q}&fields=files(id)&spaces=drive`, {
			headers: this.authHeaders()
		});

		if (!res.ok) {
			throw new Error(`Drive file search failed: ${res.status} ${res.statusText}`);
		}

		const data = (await res.json()) as { files: { id: string }[] };
		const fileId = data.files[0]?.id ?? null;

		if (fileId) {
			this.fileIdCache = fileId;
		}

		return fileId;
	}

	/* ----------------------------- JSON I/O --------------------------------- */

	/**
	 * Reads the entire store from Drive as a `{ [id]: T }` map.
	 * Each entry is validated with `ctx.schema`; invalid entries are discarded
	 * with a console error so one corrupt record cannot break the whole store.
	 */
	private async readStore(ctx: StorageAdapterContext<T>): Promise<Record<string, T>> {
		const fileId = await this.findFileId();

		if (!fileId) {
			return {};
		}

		const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
			headers: this.authHeaders()
		});

		if (!res.ok) {
			throw new Error(`Drive file read failed: ${res.status} ${res.statusText}`);
		}

		let raw: unknown;

		try {
			raw = await res.json();
		} catch {
			console.error('GoogleDriveAdapter.readStore, file is not valid JSON, returning empty store');
			return {};
		}

		if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
			console.error('GoogleDriveAdapter.readStore, unexpected root shape, returning empty store');
			return {};
		}

		const storeSchema = z.record(z.string(), ctx.schema);
		return storeSchema.parse(raw);
	}

	/**
	 * Writes (overwrites) the entire store back to Drive.
	 * Creates the file (and folder, if configured) if they do not exist yet.
	 */
	private async writeStore(store: Record<string, T>): Promise<void> {
		const body = JSON.stringify(store, null, 2);
		const existingId = await this.findFileId();

		if (existingId) {
			const res = await fetch(`${DRIVE_UPLOAD_URL}/${existingId}?uploadType=media`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${this.config.accessToken}`,
					'Content-Type': 'application/json'
				},
				body
			});

			if (!res.ok) {
				throw new Error(`Drive file update failed: ${res.status} ${res.statusText}`);
			}

			return;
		}

		// File does not exist – create metadata first, then upload content
		const folderId = await this.resolveFolderId();
		const { fileName } = this.config;

		const metadataRes = await fetch(DRIVE_FILES_URL, {
			method: 'POST',
			headers: this.authHeaders(),
			body: JSON.stringify({
				name: fileName,
				mimeType: 'application/json',
				...(folderId ? { parents: [folderId] } : {})
			})
		});

		if (!metadataRes.ok) {
			throw new Error(
				`Drive file metadata creation failed: ${metadataRes.status} ${metadataRes.statusText}`
			);
		}

		const created = (await metadataRes.json()) as { id: string };
		this.fileIdCache = created.id;

		const res = await fetch(`${DRIVE_UPLOAD_URL}/${this.fileIdCache}?uploadType=media`, {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${this.config.accessToken}`,
				'Content-Type': 'application/json'
			},
			body
		});

		if (!res.ok) {
			throw new Error(`Drive file content upload failed: ${res.status} ${res.statusText}`);
		}
	}

	async getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
		const store = await this.readStore(ctx);
		return Object.values(store);
	}

	async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
		const store = await this.readStore(ctx);
		const record = store[id as string];

		if (record === undefined) {
			return null;
		}

		return record;
	}

	async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		return (await this.getById(id, ctx)) !== null;
	}

	async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
		const newValue = { id: crypto.randomUUID(), ...value } as T;
		const store = await this.readStore(ctx);
		store[newValue.id as string] = newValue;
		await this.writeStore(store);
		return newValue;
	}

	async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
		if (!(await this.has(id, ctx))) {
			return false;
		}

		const store = await this.readStore(ctx);
		delete store[id as string];
		await this.writeStore(store);
		return true;
	}

	async clear(): Promise<void> {
		await this.writeStore({});
	}
}
