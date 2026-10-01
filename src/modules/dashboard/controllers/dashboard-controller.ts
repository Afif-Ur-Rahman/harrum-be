import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { catchAsync } from "@/utils";

import {
  dismissStockAlert,
  getDashboardStats,
  getSalesAnalytics,
  getStockAlerts,
  getTopProducts,
} from "../services";
import { getDashboardRanges, InvalidDashboardFilterError } from "../utils";

const getQueryString = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);

export const getStats = catchAsync(async (req: Request, res: Response) => {
  try {
    const ranges = getDashboardRanges({
      filter: getQueryString(req.query.filter),
      from: getQueryString(req.query.from),
      to: getQueryString(req.query.to),
    });

    const [dashboardStats, stockAlerts, topProducts, salesAnalytics] = await Promise.all([
      getDashboardStats(ranges),
      getStockAlerts(),
      getTopProducts(ranges.current),
      getSalesAnalytics(ranges),
    ]);

    return res.status(statusCodes.OK).json({
      message: "Dashboard stats fetched successfully",
      data: {
        ...dashboardStats,
        stockAlerts,
        topProducts,
        salesAnalytics,
      },
    });
  } catch (error: any) {
    if (error instanceof InvalidDashboardFilterError) {
      return res.status(statusCodes.BAD_REQUEST).json({ message: error.message });
    }

    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Failed to fetch dashboard stats",
      error,
    });
  }
});

export const dismissStock = catchAsync(async (req: Request, res: Response) => {
  try {
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
