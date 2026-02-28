import {
  type BookMetadata,
  type StoredBook,
  type UploadBookFormData,
  BookMetadataSchema
} from '$lib/data/ebook/ebook.types'
import { logger } from '$lib/logging/logger'
import {
  findFileByName,
  findOrCreateFolder,
  readFile,
  readFileAsText,
  writeTextFile,
  writeBinaryFile,
  deleteFile
} from '$lib/server/google/googleDrive'
import { z } from 'zod/v4'

const DriveBookProgressSchema = z.object({
  id: z.string(),
  cfi: z.string(),
  progress: z.number()
})

const DriveBookZoomSchema = z.object({
  id: z.string(),
  zoom: z.number()
})

const FOLDER_NAME = 'etoshokan-data'
const EBOOKS_FOLDER_NAME = 'ebooks'
const METADATA_FILE_NAME = 'ebook-data.json'

// --- Public API ---

export async function getDriveBooksMetadata(token: string): Promise<BookMetadata[]> {
  return readDriveMetadataFile(token)
}

export async function getDriveBookMetadataById(
  bookId: string,
  token: string
): Promise<BookMetadata | null> {
  const metadata = await getDriveBooksMetadata(token)
  return metadata.find((b) => b.id === bookId) ?? null
}

export async function getDriveBookData(
  id: string,
  token: string
): Promise<ArrayBuffer | undefined> {
  const ebooksFolder = await getEbooksFolderId(token)
  const fileId = await findFileByName(token, `${id}.epub`, ebooksFolder)

  if (!fileId) {
    logger.warn(`Book ${id} was not found`)
    return undefined
  }

  return readFile(token, fileId)
}

export async function saveBookToDrive(book: StoredBook, token: string): Promise<void> {
  const ebooksFolder = await getEbooksFolderId(token)
  const existingFileId = await findFileByName(token, `${book.metadata.id}.epub`, ebooksFolder)

  await writeBinaryFile(token, book.file, {
    fileId: existingFileId,
    fileName: `${book.metadata.id}.epub`,
    parentId: ebooksFolder,
    contentType: 'application/epub+zip'
  })

  const allMetadata = await readDriveMetadataFile(token)
  const existingIndex = allMetadata.findIndex((m) => m.id === book.metadata.id)

  if (existingIndex >= 0) {
    allMetadata[existingIndex] = book.metadata
  } else {
    allMetadata.push(book.metadata)
  }

  allMetadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt))
  await writeDriveMetadataFile(token, allMetadata)
}

export async function deleteBookFromDrive(id: string, token: string): Promise<void> {
  const ebooksFolder = await getEbooksFolderId(token)
  const fileId = await findFileByName(token, `${id}.epub`, ebooksFolder)

  if (fileId) {
    logger.info('Deleting book', { id })
    await deleteFile(token, fileId)
  }

  const metadata = await readDriveMetadataFile(token)
  const filtered = metadata.filter((m) => m.id !== id)
  await writeDriveMetadataFile(token, filtered)
}

type UpdateDriveBookProgressArgs = {
  id: string
  cfi: string
  progress: number
  token: string
}

export async function updateDriveBookProgress({
  id,
  cfi,
  progress,
  token
}: UpdateDriveBookProgressArgs): Promise<void> {
  DriveBookProgressSchema.parse({ id, cfi, progress })
  const metadata = await readDriveMetadataFile(token)
  const book = metadata.find((m) => m.id === id)

  if (book) {
    book.currentCfi = cfi
    book.progress = progress
    book.lastReadAt = Date.now()

    metadata.sort((a, b) => (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt))
    logger.info('Updating book progress', { id, progress })
    await writeDriveMetadataFile(token, metadata)
  }
}

type UpdateDriveBookZoomArgs = {
  id: string
  zoom: number
  token: string
}

export async function updateDriveBookZoom({
  id,
  token,
  zoom
}: UpdateDriveBookZoomArgs): Promise<void> {
  DriveBookZoomSchema.parse({ id, zoom })
  const metadata = await readDriveMetadataFile(token)
  const book = metadata.find((m) => m.id === id)

  if (book) {
    book.zoom = zoom
    logger.info('Updating book zoom', { id, zoom })
    await writeDriveMetadataFile(token, metadata)
  }
}

export async function uploadBookToDrive(
  data: UploadBookFormData,
  token: string
): Promise<BookMetadata> {
  const arrayBuffer = data.ebookData
  const bookId = crypto.randomUUID()
  const bookMetadata: BookMetadata = {
    id: bookId,
    title: data.title,
    author: data.author,
    cover: data.cover,
    addedAt: Date.now()
  }

  logger.info('Uploading book to drive: ', { bookId, title: bookMetadata.title })
  await saveBookToDrive(
    {
      metadata: bookMetadata,
      file: arrayBuffer
    },
    token
  )

  return bookMetadata
}

// -- Helpers --

async function getRootFolderId(token: string): Promise<string> {
  return findOrCreateFolder(token, FOLDER_NAME)
}

async function getEbooksFolderId(token: string): Promise<string> {
  const rootId = await getRootFolderId(token)
  return findOrCreateFolder(token, EBOOKS_FOLDER_NAME, rootId)
}

async function getDriveMetadataFileId(token: string): Promise<string | null> {
  const rootId = await getRootFolderId(token)
  return findFileByName(token, METADATA_FILE_NAME, rootId)
}

async function readDriveMetadataFile(token: string): Promise<BookMetadata[]> {
  const fileId = await getDriveMetadataFileId(token)
  if (!fileId) {
    return []
  }

  const text = await readFileAsText(token, fileId)
  const data = JSON.parse(text)
  return z.array(BookMetadataSchema).parse(data)
}

async function writeDriveMetadataFile(token: string, metadata: BookMetadata[]): Promise<void> {
  const rootId = await getRootFolderId(token)
  const fileId = await getDriveMetadataFileId(token)

  await writeTextFile(token, JSON.stringify(metadata), {
    fileId,
    fileName: METADATA_FILE_NAME,
    parentId: rootId,
    contentType: 'application/json'
  })
}
