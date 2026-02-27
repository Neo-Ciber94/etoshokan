import z from 'zod'
import {
  NoopKeyValueStorage,
  StorageAdapter,
  type StorageAdapterContext
} from '../storage-adapter'
import type { HasId } from '../types'
import {
  findFileByName,
  findOrCreateFolder,
  readFileAsText,
  writeTextFile
} from '$lib/server/google/googleDrive'

type GoogleDriveAdapterConfig = {
  /** OAuth 2.0 access token with at least the `drive.file` scope. */
  accessToken: string
  /** The name of the JSON file to use as the data store (e.g. "my-store.json"). */
  fileName: string
  /**
   * The name of the Drive folder to store the file in.
   * The folder will be created if it does not exist.
   */
  folderName: string
}

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
  readonly local = new NoopKeyValueStorage()

  /** Cached Drive file ID for the JSON store file. */
  private fileIdCache: string | null = null

  /** Cached Drive folder ID (resolved from `config.folderName`). */
  private folderIdCache: string | null = null

  constructor(readonly config: GoogleDriveAdapterConfig) {
    super()
  }

  /**
   * Resolves the Drive folder ID for `config.folderName`.
   * If the folder does not exist it is created.
   * Returns `null` when no `folderName` is configured (use Drive root).
   */
  private async resolveFolderId(): Promise<string | null> {
    if (!this.config.folderName) {
      return null
    }

    if (this.folderIdCache) {
      return this.folderIdCache
    }

    this.folderIdCache = await findOrCreateFolder(this.config.accessToken, this.config.folderName)
    return this.folderIdCache
  }

  /* ----------------------- File resolution / creation --------------------- */

  /**
   * Resolves the Drive file ID for `config.fileName` inside the resolved
   * folder (or root). Returns `null` if the file does not yet exist.
   */
  private async findFileId(): Promise<string | null> {
    if (this.fileIdCache) {
      return this.fileIdCache
    }

    const folderId = await this.resolveFolderId()
    const parentClause = folderId ? folderId : undefined

    const fileId = await findFileByName(this.config.accessToken, this.config.fileName, parentClause)

    if (fileId) {
      this.fileIdCache = fileId
    }

    return fileId
  }

  /* ----------------------------- JSON I/O --------------------------------- */

  /**
   * Reads the entire store from Drive as a `{ [id]: T }` map.
   * Each entry is validated with `ctx.schema`; invalid entries are discarded
   * with a console error so one corrupt record cannot break the whole store.
   */
  private async readStore(ctx: StorageAdapterContext<T>): Promise<Record<string, T>> {
    const fileId = await this.findFileId()

    if (!fileId) {
      return {}
    }

    let raw: unknown

    try {
      const text = await readFileAsText(this.config.accessToken, fileId)
      raw = JSON.parse(text)
    } catch {
      console.error('GoogleDriveAdapter.readStore, file is not valid JSON, returning empty store')
      return {}
    }

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      console.error('GoogleDriveAdapter.readStore, unexpected root shape, returning empty store')
      return {}
    }

    const storeSchema = z.record(z.string(), ctx.schema)
    return storeSchema.parse(raw)
  }

  /**
   * Writes (overwrites) the entire store back to Drive.
   * Creates the file (and folder, if configured) if they do not exist yet.
   */
  private async writeStore(store: Record<string, T>): Promise<void> {
    const folderId = await this.resolveFolderId()
    const existingId = await this.findFileId()

    const newId = await writeTextFile(this.config.accessToken, JSON.stringify(store, null, 2), {
      fileId: existingId,
      fileName: this.config.fileName,
      parentId: folderId ?? undefined,
      contentType: 'application/json'
    })

    if (!this.fileIdCache) {
      this.fileIdCache = newId
    }
  }

  async getAll(ctx: StorageAdapterContext<T>): Promise<T[]> {
    const store = await this.readStore(ctx)
    return Object.values(store)
  }

  async getById(id: T['id'], ctx: StorageAdapterContext<T>): Promise<T | null> {
    const store = await this.readStore(ctx)
    const record = store[id as string]

    if (record === undefined) {
      return null
    }

    return record
  }

  async has(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
    return (await this.getById(id, ctx)) !== null
  }

  async add(value: Omit<T, 'id'>, ctx: StorageAdapterContext<T>): Promise<T> {
    const newValue = { id: crypto.randomUUID(), ...value } as T
    const store = await this.readStore(ctx)
    store[newValue.id as string] = newValue
    await this.writeStore(store)
    return newValue
  }

  async remove(id: T['id'], ctx: StorageAdapterContext<T>): Promise<boolean> {
    if (!(await this.has(id, ctx))) {
      return false
    }

    const store = await this.readStore(ctx)
    delete store[id as string]
    await this.writeStore(store)
    return true
  }

  async clear(): Promise<void> {
    await this.writeStore({})
  }
}
