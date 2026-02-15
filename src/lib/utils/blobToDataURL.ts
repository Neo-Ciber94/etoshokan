// export async function blobToDataURL(blob: Blob): Promise<string> {
// 	const buffer = await blob.arrayBuffer();
// 	const base64 = Buffer.from(buffer).toString('base64');
// 	const mimeType = blob.type || 'application/octet-stream';
// 	return `data:${mimeType};base64,${base64}`;
// }

export async function blobToDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
