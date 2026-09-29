import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import { dismissStockAlert, getDashboardStats, getStockAlerts } from "../services";

export const getStats = catchAsync(async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "Access denied. Not owner",
      });
    }

    const [dashboardStats, stockAlerts] = await Promise.all([
      getDashboardStats(),
      getStockAlerts(),
    ]);

    return res.status(statusCodes.OK).json({
      message: "Dashboard stats fetched successfully",
      data: {
        ...dashboardStats,
        stockAlerts,
      },
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch dashboard stats",
      error,
    });
  }
});

export const dismissStock = catchAsync(async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== "owner") {
      return res.status(statusCodes.FORBIDDEN).json({ message: "Access denied. Not owner" });
    }

    const { stockId } = req.params;
    const { variantId } = req.body ?? {};

    const result = await dismissStockAlert(stockId as string, variantId);

    if (result === "invalid") {
      return res.status(statusCodes.BAD_REQUEST).json({ message: "Invalid stock or variant id" });
    }

    if (result === "not_found") {
      return res.status(statusCodes.NOT_FOUND).json({ message: "Stock alert not found" });
    }

    return res.status(statusCodes.OK).json({ message: "Stock alert dismissed" });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to dismiss stock alert",
      error,
    });
  }
});
