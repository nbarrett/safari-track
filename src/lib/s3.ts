import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";

function getClient() {
  return new S3Client({
    region: env.AWS_S3_REGION ?? "eu-west-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const client = getClient();
  const bucket = env.AWS_S3_BUCKET ?? "";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return getPublicUrl(key);
}

export function getPublicUrl(key: string): string {
  const bucket = env.AWS_S3_BUCKET ?? "";
  const region = env.AWS_S3_REGION ?? "eu-west-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
