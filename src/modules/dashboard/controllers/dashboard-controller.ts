import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import { getDashboardStats, getStockAlerts } from "../services";

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
