/**
 * @fileOverview Client-side encryption utility for sensitive data.
 * Uses Web Crypto API (AES-GCM) to encrypt and decrypt strings.
 */

const ALGORITHM = 'AES-GCM';

/**
 * Derives a cryptographic key from a user-provided string.
 */
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(passphrase.padEnd(32, '0').slice(0, 32));
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using the provided passphrase.
 * Returns a base64 encoded string containing the IV and ciphertext.
 */
export async function encryptData(text: string, passphrase: string): Promise<string> {
  if (!text) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    const result = new Uint8Array(iv.length + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback to plain text if encryption fails (should not happen in modern browsers)
  }
}

/**
 * Decrypts a base64 encoded string using the provided passphrase.
 */
export async function decryptData(encoded: string, passphrase: string): Promise<string> {
  if (!encoded || !passphrase) return encoded;
  
  // Basic check if it looks like base64
  if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) return encoded;

  try {
    const decoder = new TextDecoder();
    const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const key = await deriveKey(passphrase);
    
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    // If decryption fails, it might be unencrypted legacy data or wrong key
    return encoded.length > 50 ? '[Encrypted Content - Key Required]' : encoded;
  }
}
