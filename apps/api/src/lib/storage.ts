import { createReadStream } from "node:fs";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Readable } from "node:stream";
import {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const UPLOAD_ROOT =
  process.env.EVIDENCE_UPLOAD_DIR ??
  path.join(process.cwd(), "uploads", "evidence");

function useS3(): boolean {
  return Boolean(
    process.env.AWS_S3_BUCKET &&
      process.env.AWS_S3_ACCESS_KEY_ID &&
      process.env.AWS_S3_SECRET_ACCESS_KEY
  );
}

function s3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY!,
    },
  });
}

function mimeFromFilename(safeName: string): string {
  const ext = path.extname(safeName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".txt": "text/plain",
    ".log": "text/plain",
  };
  return mimeTypes[ext] ?? "application/octet-stream";
}

export async function saveEvidenceFile(
  orgId: string,
  filename: string,
  buffer: Buffer
): Promise<{ fileKey: string; mimeType: string }> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const fileKey = `${orgId}/${randomUUID()}-${safeName}`;
  const mimeType = mimeFromFilename(safeName);

  if (useS3()) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return { fileKey, mimeType };
  }

  const fullPath = path.join(UPLOAD_ROOT, fileKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return { fileKey, mimeType };
}

export function resolveEvidencePath(fileKey: string): string {
  const normalized = path.normalize(fileKey);
  if (normalized.includes("..")) {
    throw new Error("Invalid file key");
  }
  return path.join(UPLOAD_ROOT, normalized);
}

export async function openEvidenceFileStream(fileKey: string): Promise<Readable> {
  if (useS3()) {
    const res = await s3Client().send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileKey,
      })
    );
    if (!res.Body) throw new Error("Empty S3 object");
    return res.Body as Readable;
  }
  return createReadStream(resolveEvidencePath(fileKey));
}

export async function readEvidenceFile(fileKey: string): Promise<Buffer> {
  if (useS3()) {
    const res = await s3Client().send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: fileKey,
      })
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty S3 object");
    return Buffer.from(bytes);
  }
  return readFile(resolveEvidencePath(fileKey));
}
