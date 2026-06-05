import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import fileHelper from "@/utils/file-helper";

interface CustomError extends Error {
  status?: number;
}

const notFound = (req: Request, res: Response): void => {
  if (req.body.fileName) {
    fileHelper.deleteFile(req.body.fileName);
  }

  res.status(statusCodes.NOT_FOUND).json({
    message: "Opps! The route you are trying to access does not exist",
  });
};

const internalServerError = (error: CustomError, req: Request, res: Response): void => {
  if (req.body.fileName) {
    fileHelper.deleteFile(req.body.fileName);
  }

  res.status(error.status || statusCodes.INTERNAL_SERVER_ERROR).json({
    message: error.message || "Something went wrong, internal server error",
  });
};

export const errorMiddleware = { notFound, internalServerError };
