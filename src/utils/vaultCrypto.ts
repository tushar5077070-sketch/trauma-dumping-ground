// Client-side Zero-Knowledge Vault Encryption (Web Crypto API — AES-256-GCM + PBKDF2-SHA256)
// The passphrase lives strictly in JavaScript memory during your active session and is NEVER
// sent to Firestore, backend servers, localStorage, or third parties.

export const VAULT_CIPHER_PREFIX = 'unsaid:e2ee:v1:';
const PBKDF2_ITERATIONS = 150000;

let activePassphrase: string | null = null;
const listeners = new Set<(unlocked: boolean) => void>();

export function getActiveVaultPassphrase(): string | null {
  return activePassphrase;
}

export function isVaultUnlocked(): boolean {
  return Boolean(activePassphrase && activePassphrase.length >= 6);
}

export function setActiveVaultPassphrase(passphrase: string): void {
  const cleaned = passphrase.trim();
  if (cleaned.length < 6) {
    throw new Error('Passphrase must be at least 6 characters long.');
  }
  activePassphrase = cleaned;
  listeners.forEach((cb) => cb(true));
}

export function clearActiveVaultPassphrase(): void {
  activePassphrase = null;
  listeners.forEach((cb) => cb(false));
}

export function subscribeVaultLockState(
  listener: (unlocked: boolean) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isEncryptedPayload(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith(VAULT_CIPHER_PREFIX);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error(
      'Web Crypto API is unavailable in this browser context. Please use HTTPS.'
    );
  }
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext into `unsaid:e2ee:v1:<saltB64>:<ivB64>:<cipherB64>` using AES-256-GCM.
 */
export async function encryptTextWithPassphrase(
  plainText: string,
  passphrase: string
): Promise<string> {
  if (!plainText) return '';
  if (isEncryptedPayload(plainText)) return plainText;

  const salt = window.crypto.getRandomValues(new Uint8Array(12));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(passphrase, salt);

  const encoded = new TextEncoder().encode(plainText);
  const cipherBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoded
  );

  return `${VAULT_CIPHER_PREFIX}${bytesToBase64(salt)}:${bytesToBase64(
    iv
  )}:${bytesToBase64(new Uint8Array(cipherBuffer))}`;
}

/**
 * Decrypts `unsaid:e2ee:v1:<saltB64>:<ivB64>:<cipherB64>` back to plaintext.
 * Throws if passphrase does not match or ciphertext is corrupted.
 */
export async function decryptTextWithPassphrase(
  payload: string,
  passphrase: string
): Promise<string> {
  if (!isEncryptedPayload(payload)) return payload;

  const rest = payload.slice(VAULT_CIPHER_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted vault payload.');
  }

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = base64ToBytes(saltB64);
  const iv = base64ToBytes(ivB64);
  const cipherBytes = base64ToBytes(cipherB64);

  const key = await deriveAesGcmKey(passphrase, salt);
  const plainBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource
  );

  return new TextDecoder().decode(plainBuffer);
}

/**
 * Encrypts text with the currently active in-memory passphrase if vault encryption is unlocked.
 * Enforces Firestore field character limits so writes never fail silently.
 */
export async function maybeEncryptForStorage(
  plainText: string,
  maxAllowedChars: number
): Promise<string> {
  const trimmed = plainText.trim();
  if (!trimmed) return '';
  if (!activePassphrase) {
    return trimmed.slice(0, maxAllowedChars);
  }
  const encrypted = await encryptTextWithPassphrase(trimmed, activePassphrase);
  if (encrypted.length > maxAllowedChars) {
    throw new Error(
      `Encrypted entry exceeds storage limit (${encrypted.length}/${maxAllowedChars} chars). Please shorten the text slightly while Zero-Knowledge Encryption is active.`
    );
  }
  return encrypted;
}

export const LOCKED_VAULT_NOTICE =
  'Encrypted with your personal Zero-Knowledge passphrase. Open Privacy & Trust to unlock and read.';
export const WRONG_PASSPHRASE_NOTICE =
  'Locked entry — current passphrase did not match this entry.';

export function isLockedVaultText(value: string | undefined | null): boolean {
  if (!value) return false;
  return (
    isEncryptedPayload(value) ||
    value === LOCKED_VAULT_NOTICE ||
    value === WRONG_PASSPHRASE_NOTICE
  );
}

/**
 * Attempts to decrypt a stored value if it is encrypted and a passphrase is active.
 * Returns a clean locked indicator object if encrypted & locked.
 */
export async function tryDecryptStoredText(
  storedValue: string,
  passphrase: string | null
): Promise<{ text: string; isLocked: boolean; decryptionFailed: boolean }> {
  if (!isEncryptedPayload(storedValue)) {
    return { text: storedValue, isLocked: false, decryptionFailed: false };
  }
  if (!passphrase) {
    return {
      text: LOCKED_VAULT_NOTICE,
      isLocked: true,
      decryptionFailed: false,
    };
  }
  try {
    const plain = await decryptTextWithPassphrase(storedValue, passphrase);
    return { text: plain, isLocked: false, decryptionFailed: false };
  } catch {
    return {
      text: WRONG_PASSPHRASE_NOTICE,
      isLocked: true,
      decryptionFailed: true,
    };
  }
}
