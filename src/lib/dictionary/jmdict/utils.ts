import { BlobReader, ZipReader } from '@zip.js/zip.js';
import type { JMDict_Root } from './types';

export async function downloadJMDictJSON(url: string) {
	const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	const text = await unzipAsText(buffer);
	const json = JSON.parse(text);
	return json as JMDict_Root;
}

export async function unzipAsText(data: ArrayBuffer) {
	const blob = new Blob([data]);

	const zipFileReader = new BlobReader(blob);
	const transformStream = new TransformStream();
	const textPromise = new Response(transformStream.readable).text();

	const zipReader = new ZipReader(zipFileReader);
	const zipEntries = await zipReader.getEntries();
	const firstEntry = zipEntries.shift()!;

	if (!('getData' in firstEntry)) {
		throw new Error('Expected zip with single entry');
	}

	await firstEntry.getData(transformStream.writable);
	await zipReader.close();

	return await textPromise;
}
