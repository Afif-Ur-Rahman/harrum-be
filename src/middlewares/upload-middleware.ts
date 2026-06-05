import fs from "fs";
import path from "path";

import { Request, Response, NextFunction } from "express";
import multer from "multer";

import { uploadFileToAws } from "@/config";
import { AWS, SERVER_URL, statusCodes } from "@/constants";
interface UploadOptions {
  destinationPath: string;
  propertyName?: string;
  fields?: { name: string; maxCount?: number }[];
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  isMultiple?: boolean;
  isOptional?: boolean;
}
const createStorage = (destinationPath: string) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath, { recursive: true });
      }
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
};

const processFile = async (file: Express.Multer.File): Promise<string> => {
  if (AWS.ACCESSKEYID) {
    // Upload to AWS S3
    const normalizedPath = file.path.replace(/\\/g, "/");
    const keyName = normalizedPath.endsWith(file.filename)
      ? normalizedPath
      : `${normalizedPath}/${file.filename}`;

    const fileUrl = await uploadFileToAws(keyName, file.path, file.mimetype);

    return fileUrl;
  } else {
    // Use local storage
    return `${SERVER_URL}/${file.path}`;
  }
};

export const uploadMiddleware = (options: UploadOptions) => {
  const {
    destinationPath,
    propertyName,
    fields,
    allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
      "video/quicktime",
      "video/h265",
      "video/hevc",
    ],
    maxFileSize = 50 * 1024 * 1024,
    isMultiple = false,
    isOptional = false,
  } = options;

  const storage = createStorage(destinationPath);

  const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`));
      return;
    }
    cb(null, true);
  };

  const limits = maxFileSize ? { fileSize: maxFileSize } : undefined;

  const multerUpload = multer({
    storage,
    fileFilter,
    limits,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    let upload;
    if (fields) {
      upload = multerUpload.fields(fields);
    } else if (isMultiple) {
      upload = multerUpload.array(propertyName!, 10);
    } else {
      upload = multerUpload.single(propertyName!);
    }

    upload(req as any, res as any, async (err) => {
      try {
        if (err) {
          const maxFileSize = options?.maxFileSize ?? 50 * 1024 * 1024;
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(statusCodes.BAD_REQUEST).json({
              message: `File size is too large. Maximum allowed size is ${maxFileSize / (1024 * 1024)}MB`,
            });
          }
          throw err;
        }

        if (fields) {
          if (!req.body) req.body = {};
          for (const field of fields) {
            const files = (req.files as Record<string, Express.Multer.File[]>)[field.name];
            if (files && files.length > 0) {
              if (field.maxCount && field.maxCount > 1) {
                req.body[field.name] = await Promise.all(files.map((file) => processFile(file)));
              } else {
                req.body[field.name] = await processFile(files[0]);
              }
            }
          }
        } else if (isMultiple) {
          if (!propertyName) {
            throw new Error("propertyName must be provided when using isMultiple");
          }
          if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            throw new Error(`No files uploaded with property name "${propertyName}"`);
          }

          const fileUrls = await Promise.all(
            (req.files as Express.Multer.File[]).map((file) => processFile(file)),
          );

          // Add file URLs to request body
          if (!req.body) req.body = {};
          req.body[propertyName] = fileUrls;
        } else {
          if (!propertyName) {
            throw new Error("propertyName must be provided when using single file upload");
          }
          if (!req.file) {
            throw new Error(`No file uploaded with property name "${propertyName}"`);
          }
          const fileUrl = await processFile(req.file);
          if (!req.body) req.body = {};
          req.body[propertyName] = fileUrl;
        }
        next();
      } catch (error: any) {
        if (!isOptional) {
          res.status(statusCodes.BAD_REQUEST).json({
            message: error.message || "Something went wrong, bad request",
          });
        } else {
          next();
        }
      }
    });
  };
};
