// cryptoUtils.js

// Generate ECDH key pair
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );
}

// Derive a shared AES-GCM key from ECDH
export async function deriveAESKey(privateKey, publicKey) {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// Export public key to send over WebRTC
export async function exportPublicKey(key) {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

// Import received public key
export async function importPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    JSON.parse(jwk),
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

// Encrypt a file chunk with AES-GCM
export async function encryptData(key, data) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );
  return { iv, encrypted };
}

// Decrypt a file chunk with AES-GCM
export async function decryptData(key, encrypted, iv) {
  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encrypted
  );
}
