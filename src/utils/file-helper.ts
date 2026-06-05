import fs from "fs";

import { deleteFileFromAws } from "@/config";
import { AWS } from "@/constants";

const deleteFile = async (path: string) => {
  if (!path) {
    console.error("File URL is required");
    return;
  }

  try {
    const url = new URL(path);
    const fileName = decodeURIComponent(url.pathname.substring(1));
    if (!AWS.ACCESSKEYID) {
      fs.unlink(fileName, (err) => {
        if (err) console.log(err);
      });
    } else {
      await deleteFileFromAws(fileName);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
};

const deleteMultipleFiles = async (paths: string[]): Promise<void> => {
  if (!paths || paths.length === 0) {
    console.error("No files to delete");
    return;
  }

  try {
    const deleteAllFiles = paths.map(async (filePath) => {
      await deleteFile(filePath);
    });

    await Promise.all(deleteAllFiles);
  } catch (error) {
    console.error("Error deleting multiple files:", error);
  }
};

export const fileHelper = {
  deleteFile,
  deleteMultipleFiles,
};

export default fileHelper;
