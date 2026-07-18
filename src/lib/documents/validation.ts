/**
 * Server-side file validation (spec §6.7 / §10): size limits, an MIME
 * allowlist, magic-byte verification against the declared type, and safe
 * filenames. Client-declared metadata is never trusted.
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Sniffs the real content type from magic bytes. Returns null when the
 * content matches no allowed signature.
 */
export function sniffMime(bytes: Uint8Array): AllowedMime | null {
  if (bytes.length < 12) return null;
  // %PDF
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  // PNG
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  // JPEG
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // WEBP: RIFF....WEBP
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  // OOXML (docx/xlsx) are zip containers: PK\x03\x04 — the declared subtype
  // disambiguates; both map to the zip signature here.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

export type FileValidationResult =
  | { ok: true; mime: AllowedMime }
  | { ok: false; reason: string };

export function validateUpload(
  bytes: Uint8Array,
  declaredMime: string,
): FileValidationResult {
  if (bytes.length === 0) {
    return { ok: false, reason: "The file is empty." };
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: `Files are limited to ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(declaredMime)) {
    return {
      ok: false,
      reason: "Only PDF, PNG, JPEG, WebP, DOCX, and XLSX files are accepted.",
    };
  }

  const sniffed = sniffMime(bytes);
  if (!sniffed) {
    return {
      ok: false,
      reason: "The file content does not match an accepted format.",
    };
  }

  // Zip-based Office formats share a signature; accept either declared
  // OOXML type for a zip container. Everything else must match exactly.
  const zipTypes: readonly string[] = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const matches =
    sniffed === declaredMime ||
    (zipTypes.includes(declaredMime) && zipTypes.includes(sniffed));
  if (!matches) {
    return {
      ok: false,
      reason:
        "The file content does not match its declared type. Rename tricks are rejected.",
    };
  }

  return { ok: true, mime: declaredMime as AllowedMime };
}

/**
 * Produces a safe storage filename: strips any path components, keeps a
 * conservative character set, and caps length while preserving the
 * extension.
 */
export function safeFilename(original: string): string {
  const base = original.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "");
  const capped = cleaned.length > 0 ? cleaned : "file";
  if (capped.length <= 100) return capped.toLowerCase();
  const dot = capped.lastIndexOf(".");
  if (dot > 0 && capped.length - dot <= 10) {
    const ext = capped.slice(dot);
    return (capped.slice(0, 100 - ext.length) + ext).toLowerCase();
  }
  return capped.slice(0, 100).toLowerCase();
}
