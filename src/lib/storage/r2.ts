import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export type UploadImageInput = {
  objectKey: string;
  contentType: string;
  body: Buffer;
};

export type UploadImageResult = {
  objectKey: string;
  objectUrl: string;
  etag: string | null;
  contentType: string;
  size: number;
};

export type SignedUploadResult = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getR2Config(): R2Config {
  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
  };
}

function toObjectUrl(
  accountId: string,
  bucketName: string,
  objectKey: string,
): string {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`;
}

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }
  const cfg = getR2Config();
  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return r2Client;
}

export async function uploadImageBuffer(
  input: UploadImageInput,
): Promise<UploadImageResult> {
  const cfg = getR2Config();
  const client = getR2Client();

  const result = await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: input.objectKey,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return {
    objectKey: input.objectKey,
    objectUrl: toObjectUrl(cfg.accountId, cfg.bucketName, input.objectKey),
    etag: result.ETag?.replace(/"/g, "") ?? null,
    contentType: input.contentType,
    size: input.body.byteLength,
  };
}

export async function signObjectUrl(
  objectKey: string,
  expiresInSeconds = 900,
): Promise<string> {
  const cfg = getR2Config();
  const client = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
    }),
    { expiresIn: expiresInSeconds },
  );
}

export async function signUploadUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<SignedUploadResult> {
  const cfg = getR2Config();
  const client = getR2Client();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds },
  );

  return {
    uploadUrl,
    objectKey,
    expiresIn: expiresInSeconds,
  };
}

export async function deleteObject(objectKey: string): Promise<void> {
  const cfg = getR2Config();
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
    }),
  );
}
