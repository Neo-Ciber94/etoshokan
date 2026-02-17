import { describe, it, expect } from 'vitest'
import { encryptAes, decryptAes } from './index'

const SECRET = 'test-secret-key-for-testing'

describe('encryptAes', () => {
  it('returns a base64url encoded string', () => {
    const result = encryptAes('hello', SECRET)
    expect(result).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces different ciphertexts for the same input (random IV)', () => {
    const a = encryptAes('hello', SECRET)
    const b = encryptAes('hello', SECRET)
    expect(a).not.toBe(b)
  })

  it('handles empty string', () => {
    const result = encryptAes('', SECRET)
    expect(result).toBeTruthy()
  })

  it('handles unicode content', () => {
    const result = encryptAes('こんにちは世界', SECRET)
    expect(result).toBeTruthy()
  })
})

describe('decryptAes', () => {
  it('decrypts back to the original value', () => {
    const encrypted = encryptAes('hello world', SECRET)
    const decrypted = decryptAes(encrypted, SECRET)
    expect(decrypted).toBe('hello world')
  })

  it('decrypts empty string', () => {
    const encrypted = encryptAes('', SECRET)
    const decrypted = decryptAes(encrypted, SECRET)
    expect(decrypted).toBe('')
  })

  it('decrypts unicode content', () => {
    const original = 'こんにちは世界 🌍'
    const encrypted = encryptAes(original, SECRET)
    const decrypted = decryptAes(encrypted, SECRET)
    expect(decrypted).toBe(original)
  })

  it('decrypts long tokens', () => {
    const original = 'ya29.' + 'a'.repeat(200)
    const encrypted = encryptAes(original, SECRET)
    const decrypted = decryptAes(encrypted, SECRET)
    expect(decrypted).toBe(original)
  })

  it('returns null for tampered ciphertext', () => {
    const encrypted = encryptAes('secret data', SECRET)
    const tampered = encrypted.slice(0, -2) + 'XX'
    expect(decryptAes(tampered, SECRET)).toBeNull()
  })

  it('returns null for wrong secret', () => {
    const encrypted = encryptAes('secret data', SECRET)
    expect(decryptAes(encrypted, 'wrong-secret')).toBeNull()
  })

  it('returns null for invalid input', () => {
    expect(decryptAes('not-valid-data', SECRET)).toBeNull()
  })

  it('returns null for too-short input', () => {
    expect(decryptAes('abc', SECRET)).toBeNull()
  })
})
