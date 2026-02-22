import { describe, it, expect } from 'vitest';
import { encryptAes, decryptAes } from './index';

const SECRET = 'test-secret-key-for-testing';

describe('encryptAes', () => {
	it('returns a base64url encoded string', async () => {
		const result = await encryptAes('hello', SECRET);
		expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('produces different ciphertexts for the same input (random IV)', async () => {
		const a = await encryptAes('hello', SECRET);
		const b = await encryptAes('hello', SECRET);
		expect(a).not.toBe(b);
	});

	it('handles empty string', async () => {
		const result = await encryptAes('', SECRET);
		expect(result).toBeTruthy();
	});

	it('handles unicode content', async () => {
		const result = await encryptAes('こんにちは世界', SECRET);
		expect(result).toBeTruthy();
	});
});

describe('decryptAes', () => {
	it('decrypts back to the original value', async () => {
		const encrypted = await encryptAes('hello world', SECRET);
		const decrypted = await decryptAes(encrypted, SECRET);
		expect(decrypted).toBe('hello world');
	});

	it('decrypts empty string', async () => {
		const encrypted = await encryptAes('', SECRET);
		const decrypted = await decryptAes(encrypted, SECRET);
		expect(decrypted).toBe('');
	});

	it('decrypts unicode content', async () => {
		const original = 'こんにちは世界 🌍';
		const encrypted = await encryptAes(original, SECRET);
		const decrypted = await decryptAes(encrypted, SECRET);
		expect(decrypted).toBe(original);
	});

	it('decrypts long tokens', async () => {
		const original = 'ya29.' + 'a'.repeat(200);
		const encrypted = await encryptAes(original, SECRET);
		const decrypted = await decryptAes(encrypted, SECRET);
		expect(decrypted).toBe(original);
	});

	it('returns null for tampered ciphertext', async () => {
		const encrypted = await encryptAes('secret data', SECRET);
		const tampered = encrypted.slice(0, -2) + 'XX';
		const result = await decryptAes(tampered, SECRET);
		expect(result).toBeNull();
	});

	it('returns null for wrong secret', async () => {
		const encrypted = await encryptAes('secret data', SECRET);
		const result = await decryptAes(encrypted, 'wrong-secret');
		expect(result).toBeNull();
	});

	it('returns null for invalid input', async () => {
		const result = await decryptAes('not-valid-data', SECRET);
		expect(result).toBeNull();
	});

	it('returns null for too-short input', async () => {
		const result = await decryptAes('abc', SECRET);
		expect(result).toBeNull();
	});
});
