import fs from "fs";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { AWS } from "@/constants/env";
import { LOGUI } from "@/constants/logs";
import { Settings } from "@/modules/setting/settings";

interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

// In-process cache — avoids a DB round-trip on every S3 operation.
// TTL: 5 minutes. Call clearAwsConfigCache() after settings are updated.
let cachedAwsConfig: AwsConfig | null = null;
let cacheExpiresAt = 0;
const AWS_CONFIG_TTL_MS = 5 * 60 * 1000;

export const clearAwsConfigCache = () => {
  cachedAwsConfig = null;
  cacheExpiresAt = 0;
};

const getAwsConfig = async (): Promise<AwsConfig> => {
  if (cachedAwsConfig && Date.now() < cacheExpiresAt) return cachedAwsConfig;

  const config = await Settings.findOne().lean();
  cachedAwsConfig = {
    region: config?.aws?.region || AWS.REGION,
    accessKeyId: config?.aws?.accessKeyId || AWS.ACCESSKEYID,
    secretAccessKey: config?.aws?.secretAccessKey || AWS.SECRETACCESSKEY,
    bucketName: config?.aws?.bucketName || AWS.BUCKET_NAME,
  };
  cacheExpiresAt = Date.now() + AWS_CONFIG_TTL_MS;
  return cachedAwsConfig;
};

// Cached S3 client — recreated when config cache is invalidated
let cachedS3Client: S3Client | null = null;

export const s3 = async (): Promise<S3Client> => {
  if (cachedS3Client && cachedAwsConfig && Date.now() < cacheExpiresAt) return cachedS3Client;

  const { region, accessKeyId, secretAccessKey } = await getAwsConfig();
  cachedS3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedS3Client;
};

export const uploadFileToAws = async (
  fileName: string,
  filePath: string,
  ContentType: string,
): Promise<string> => {
  try {
    const { region, bucketName } = await getAwsConfig();
    const S3Client = await s3();
    await S3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: fs.createReadStream(filePath),
        ContentType,
      }),
    ).then(() => {
      // Delete the file from the local filesystem after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error(LOGUI.FgRed, "Error deleting file:", err);
          }
        });
      }
    });

    const encodedFileName = encodeURIComponent(fileName).replace(/%2F/g, "/");
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${encodedFileName}`;

    return publicUrl;
  } catch (err) {
    console.error("Error ", err);
    return err as string;
  }
};

export const getFileUrlFromAws = async (
  fileName: string,
  expireTime: number | null = null,
): Promise<string> => {
  try {
    const { bucketName } = await getAwsConfig();
    const check = await isFileAvailableInAwsBucket(fileName);

    if (check) {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      });

      const url = await getSignedUrl(await s3(), command, {
        expiresIn: expireTime ?? undefined,
      });
      return url;
    } else {
      return "error";
    }
  } catch (err) {
    console.log("error ::", err);
    return "error";
  }
};

export const isFileAvailableInAwsBucket = async (fileName: string): Promise<boolean> => {
  try {
    const { bucketName } = await getAwsConfig();
    const S3Client = await s3();
    await S3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      }),
    );
    return true;
  } catch (err: any) {
    if (err.name === "NotFound") {
      return false;
    } else {
      console.error("Error checking file availability: ", err);
      return false;
    }
  }
};

export const deleteFileFromAws = async (fileName: string): Promise<string> => {
  try {
    const { bucketName } = await getAwsConfig();
    const S3Client = await s3();
    const deleteParams = {
      Bucket: bucketName,
      Key: fileName,
    };

    await S3Client.send(new DeleteObjectCommand(deleteParams));
    return "success";
  } catch (err) {
    console.error("Error ", err);
    return "error";
  }
};
