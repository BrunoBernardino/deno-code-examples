import 'std/dotenv/load.ts';
import { ApiFactory } from 'https://deno.land/x/aws_api@v0.8.1/client/mod.ts';
import { S3 } from 'https://deno.land/x/aws_api@v0.8.1/services/s3/mod.ts';
import { DeleteObjectRequest, PutObjectRequest } from 'https://deno.land/x/aws_api@v0.8.1/services/s3/structs.ts';
import { getPresignedUrl } from 'https://deno.land/x/aws_api@v0.8.1/extras/s3-presign.ts';

const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID') || '';
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY') || '';
const AWS_REGION = Deno.env.get('AWS_REGION') || '';
const AWS_BUCKET = Deno.env.get('AWS_BUCKET') || '';

const s3Client = new ApiFactory({
  region: AWS_REGION,
  credentials: { awsAccessKeyId: AWS_ACCESS_KEY_ID, awsSecretKey: AWS_SECRET_ACCESS_KEY },
}).makeNew(S3);

async function uploadFile(
  bucket: string,
  fileKey: string,
  contentType: string,
  data: Uint8Array,
  extraParams: Omit<PutObjectRequest, 'Bucket' | 'Key' | 'Body' | 'ContenType'> = {},
) {
  const params = {
    Bucket: bucket,
    Key: fileKey,
    Body: data,
    ContentType: contentType,
    ...extraParams,
  };

  await s3Client.putObject(params);
}

export async function getSignedFileUrl(filePath: string) {
  const url = await getPresignedUrl({
    credentials: {
      awsAccessKeyId: AWS_ACCESS_KEY_ID,
      awsSecretKey: AWS_SECRET_ACCESS_KEY,
    },
    bucket: AWS_BUCKET,
    path: `/${filePath}`,
    region: AWS_REGION,
  });

  return url;
}

export async function uploadUserFile(
  userId: string,
  fileName: string,
  contentType: string,
  data: Uint8Array,
  extraParams: Omit<PutObjectRequest, 'Bucket' | 'Key' | 'Body' | 'ContenType'> = {},
) {
  const fileKey = `user-${userId}/file-${fileName}`;

  await uploadFile(
    AWS_BUCKET,
    fileKey,
    contentType,
    data,
    extraParams,
  );

  return fileKey;
}

export async function deleteUserFile(
  fileKey: string,
  extraParams: Omit<DeleteObjectRequest, 'Bucket' | 'Key' | 'Body' | 'ContenType'> = {},
) {
  const params = {
    Bucket: AWS_BUCKET,
    Key: fileKey,
    ...extraParams,
  };

  await s3Client.deleteObject(params);
}
