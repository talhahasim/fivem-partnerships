/**
 * Webhook URL'leri için AES-256-GCM şifreleme.
 * Web Crypto API kullanır → hem Node (Next server) hem Cloudflare Worker'da çalışır.
 * Anahtar: WEBHOOK_ENC_KEY (base64, 32 byte).
 *
 * Ciphertext formatı (base64): [12 byte IV][ciphertext + 16 byte GCM tag]
 */

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function getKeyBytes(rawBase64: string): Uint8Array<ArrayBuffer> {
  const bytes = fromBase64(rawBase64);
  if (bytes.length !== 32) {
    throw new Error("WEBHOOK_ENC_KEY 32 byte (base64) olmalı");
  }
  return bytes;
}

async function importKey(rawBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", getKeyBytes(rawBase64), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * `aad` (additional authenticated data) ciphertext'i bir bağlama bağlar (örn. store_id).
 * Çözerken aynı aad verilmezse GCM doğrulaması başarısız olur → bir kaydın ciphertext'i
 * başka mağazaya kopyalanamaz (ciphertext-swap saldırısına karşı).
 */
export async function encryptSecret(
  plaintext: string,
  keyBase64: string,
  aad?: string,
): Promise<string> {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const params = aad
    ? { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }
    : { name: "AES-GCM", iv };
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(params, key, new TextEncoder().encode(plaintext)),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toBase64(out);
}

export async function decryptSecret(
  ciphertextBase64: string,
  keyBase64: string,
  aad?: string,
): Promise<string> {
  const key = await importKey(keyBase64);
  const raw = fromBase64(ciphertextBase64);
  const iv = raw.slice(0, 12);
  const ct = raw.slice(12);
  const params = aad
    ? { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) }
    : { name: "AES-GCM", iv };
  const pt = await crypto.subtle.decrypt(params, key, ct);
  return new TextDecoder().decode(pt);
}
