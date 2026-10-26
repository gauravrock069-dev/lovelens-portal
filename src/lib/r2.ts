import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isMockMode } from "./mock-db";

let r2Client: S3Client | null = null;

function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return r2Client;
}

export async function presignPut(key: string, contentType: string, expiresIn = 900) {
  if (isMockMode()) {
    return `/api/mock-upload?key=${encodeURIComponent(key)}`;
  }
  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export const publicUrl = (key: string) => {
  if (isMockMode()) {
    return `/api/mock-upload?key=${encodeURIComponent(key)}`;
  }
  return `${(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`;
};

