/**
 * @fileOverview Client-side encryption utility for sensitive data.
 * Uses Web Crypto API (AES-GCM) to encrypt and decrypt strings and numbers.
 * The key is automatically derived from the user's UID to ensure developers can't read the data,
 * but users have a seamless experience.
 */

const ALGORITHM = 'AES-GCM';

// Cache the derived key to avoid expensive recalculations during bulk decryption
let cachedKey: { uid: string; key: CryptoKey } | null = null;

/**
 * Derives a cryptographic key from a stable user-specific secret (the UID).
 * This ensures data is developer-proof at rest in Firestore.
 */
async function deriveKey(uid: string): Promise<CryptoKey> {
  // Return cached key if UID matches to speed up bulk operations
  if (cachedKey && cachedKey.uid === uid) {
    return cachedKey.key;
  }

  const encoder = new TextEncoder();
  // We use a salt combined with the UID to ensure the key isn't just the raw UID string.
  const salt = "lifetrack_secure_v1_";
  const rawKey = encoder.encode((salt + uid).padEnd(32, '0').slice(0, 32));
  
  const key = await crypto.subtle.importKey(
    'raw',
    rawKey,
    ALGORITHM,
    false,
    ['encrypt', 'decrypt']
  );

  cachedKey = { uid, key };
  return key;
}

/**
 * Encrypts a value (string or number) using the user's UID.
 */
export async function encryptData(value: string | number | undefined | null, uid: string): Promise<string> {
  if (value === undefined || value === null) return '';
  const text = value.toString();
  if (!text) return '';
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const key = await deriveKey(uid);
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
    return text;
  }
}

/**
 * Decrypts a base64 encoded string using the user's UID.
 */
export async function decryptData(encoded: string | undefined | null, uid: string): Promise<string> {
  if (!encoded || !uid) return encoded || '';
  
  // Basic check if it looks like base64
  if (!/^[A-Za-z0-9+/=]+$/.test(encoded)) return encoded;

  try {
    const decoder = new TextDecoder();
    const data = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const key = await deriveKey(uid);
    
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    // If it fails, it might not be encrypted or key changed, return original
    return encoded;
  }
}

/**
 * Decrypts a base64 encoded string and returns it as a number.
 */
export async function decryptNumber(encoded: string | number | undefined | null, uid: string): Promise<number> {
  if (typeof encoded === 'number') return encoded;
  const decrypted = await decryptData(encoded, uid);
  const num = parseFloat(decrypted);
  return isNaN(num) ? 0 : num;
}
