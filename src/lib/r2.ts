// src/lib/r2.ts

/**
 * Cloudflare R2 Storage Utility
 * Uses the 'STORAGE' binding defined in wrangler.toml
 */

export async function uploadToR2(
  key: string,
  body: ArrayBuffer | string | Blob,
  contentType: string,
  storageBinding: any // Pass the STORAGE binding here
) {
  if (!storageBinding) {
    throw new Error("R2 Storage binding 'STORAGE' not found.");
  }

  await storageBinding.put(key, body, {
    httpMetadata: { contentType },
  });

  return `/api/storage/${key}`;
}

export async function getFromR2(key: string, storageBinding: any) {
  if (!storageBinding) {
    throw new Error("R2 Storage binding 'STORAGE' not found.");
  }

  const object = await storageBinding.get(key);
  if (!object) return null;

  return object;
}

export async function deleteFromR2(key: string, storageBinding: any) {
  if (!storageBinding) {
    throw new Error("R2 Storage binding 'STORAGE' not found.");
  }

  await storageBinding.delete(key);
}
