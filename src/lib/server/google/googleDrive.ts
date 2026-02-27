const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

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
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Drive API error (${res.status}): ${body}`)
  }

  return res
}

export async function findFileByName(
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
  ].join(' and ')

  const res = await driveRequest(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
    token
  )

  const data: { files: { id: string; name: string }[] } = await res.json()
  return data.files[0]?.id ?? null
}

export async function findOrCreateFolder(
  token: string,
  name: string,
  parentId?: string
): Promise<string> {
  const existing = await findFileByName(
    token,
    name,
    parentId,
    'application/vnd.google-apps.folder'
  )

  if (existing) {
    return existing
  }

  const res = await driveRequest(`${DRIVE_API}/files`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {})
    })
  })

  const folder: { id: string } = await res.json()
  return folder.id
}

export async function readFile(token: string, fileId: string): Promise<ArrayBuffer> {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`, token)
  return res.arrayBuffer()
}

export async function readFileAsText(token: string, fileId: string): Promise<string> {
  const res = await driveRequest(`${DRIVE_API}/files/${fileId}?alt=media`, token)
  return res.text()
}

type WriteFileOpts = {
  fileId?: string | null
  fileName?: string
  parentId?: string
  contentType?: string
}

/**
 * Writes text content (any string-based content type) to a Drive file.
 * Updates the existing file when `opts.fileId` is provided, otherwise
 * creates a new file using `opts.fileName` and `opts.parentId`.
 * Returns the file ID.
 */
export async function writeTextFile(
  token: string,
  content: string,
  opts: WriteFileOpts
): Promise<string> {
  const contentType = opts.contentType ?? 'application/json'

  if (opts.fileId) {
    await driveRequest(`${DRIVE_UPLOAD_API}/files/${opts.fileId}?uploadType=media`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': contentType },
      body: content
    })
    return opts.fileId
  }

  const boundary = 'drive_text_boundary'
  const metadata = JSON.stringify({
    name: opts.fileName,
    ...(opts.parentId ? { parents: [opts.parentId] } : {})
  })

  const multipartBody = [
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadata,
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${contentType}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`
  ].join('')

  const res = await driveRequest(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipartBody
  })

  const created: { id: string } = await res.json()
  return created.id
}

/**
 * Writes binary content to a Drive file.
 * Updates the existing file when `opts.fileId` is provided, otherwise
 * creates a new file using `opts.fileName` and `opts.parentId`.
 * Returns the file ID.
 */
export async function writeBinaryFile(
  token: string,
  data: ArrayBuffer,
  opts: WriteFileOpts
): Promise<string> {
  const contentType = opts.contentType ?? 'application/octet-stream'

  if (opts.fileId) {
    await driveRequest(`${DRIVE_UPLOAD_API}/files/${opts.fileId}?uploadType=media`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': contentType },
      body: data
    })
    return opts.fileId
  }

  // https://developers.google.com/workspace/drive/api/guides/manage-uploads#http_1
  // Manually construct multipart/related body so binary content is not re-encoded
  const textEncoder = new TextEncoder()
  const boundary = 'drive_binary_boundary'
  const metadata = JSON.stringify({
    name: opts.fileName,
    ...(opts.parentId ? { parents: [opts.parentId] } : {})
  })

  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`
  const filePart = `--${boundary}\r\nContent-Type: ${contentType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  const closingBoundary = `\r\n--${boundary}--`

  const metaBytes = textEncoder.encode(metaPart)
  const filePartBytes = textEncoder.encode(filePart)
  const closingBytes = textEncoder.encode(closingBoundary)

  const body = new Uint8Array(
    metaBytes.length + filePartBytes.length + data.byteLength + closingBytes.length
  )
  body.set(metaBytes, 0)
  body.set(filePartBytes, metaBytes.length)
  body.set(new Uint8Array(data), metaBytes.length + filePartBytes.length)
  body.set(closingBytes, metaBytes.length + filePartBytes.length + data.byteLength)

  const res = await driveRequest(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  })

  const created: { id: string } = await res.json()
  return created.id
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  await driveRequest(`${DRIVE_API}/files/${fileId}`, token, { method: 'DELETE' })
}
