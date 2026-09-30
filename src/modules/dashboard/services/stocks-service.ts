import mongoose from "mongoose";

import { Stock } from "@/modules/stock";

export type StockAlertStatus = "Critical" | "Low" | "Moderate";

export interface StockAlertItem {
  id: string;
  stockId: string;
  variantId?: string;
  name: string;
  brand: string;
  color?: string;
  date: string;
  quantity: string;
  status: StockAlertStatus;
}

const isMeter = (size: string) => {
  const s = size.toLowerCase().trim();
  return s.includes("meter") || s === "m" || s === "meters";
};

const isPiece = (size: string) => {
  const s = size.toLowerCase().trim();
  return s.includes("piece") || s === "pcs" || s === "pc";
};

const isGaz = (size: string) => {
  const s = size.toLowerCase().trim();
  return s.includes("gaz") || s === "gz";
};

const normalizeType = (type: string) =>
  type
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[\s-]+/g, "_");

const getStockAlertStatus = (
  quantity: number,
  size: string,
  type: string,
): StockAlertStatus | null => {
  const normalizedType = normalizeType(type || "");

  if (isPiece(size)) {
    if (quantity < 2) return "Critical";
    if (quantity === 2) return "Low";
    return null;
  }

  if (isMeter(size)) {
    if (normalizedType === "latha") {
      if (quantity <= 7) return "Critical";
      if (quantity <= 14) return "Low";
      return null;
    }

    if (normalizedType === "cotton") {
      if (quantity <= 4.5) return "Critical";
      if (quantity <= 9) return "Low";
      return null;
    }

    if (normalizedType === "wash_and_wear") {
      if (quantity <= 4) return "Critical";
      if (quantity <= 8) return "Low";
      return null;
    }

    return null;
  }

  if (isGaz(size) && normalizedType === "boski") {
    if (quantity <= 7) return "Critical";
    if (quantity <= 14) return "Low";
    return null;
  }

  return null;
};

export const getStockAlerts = async (): Promise<StockAlertItem[]> => {
  const stocks = await Stock.find({
    $or: [
      { variants: { $elemMatch: { showAlert: { $ne: false } } } },
      {
        variants: { $size: 0 },
        quantity: { $exists: true },
        showAlert: { $ne: false },
      },
    ],
  })
    .select("name brand size type quantity showAlert variants updatedAt")
    .lean();

  const alerts: StockAlertItem[] = [];

  for (const stock of stocks) {
    const stockType = stock.type || "";

    if (stock.variants?.length) {
      for (const variant of stock.variants) {
        if (variant.showAlert === false) continue;

        const status = getStockAlertStatus(variant.quantity, stock.size, stockType);

        if (!status) continue;

        alerts.push({
          id: variant._id?.toString() || stock._id.toString(),
          stockId: stock._id.toString(),
          variantId: variant._id?.toString(),
          name: stock.name,
          brand: stock.brand,
          color: variant.color,
          date: stock.updatedAt.toISOString(),
          quantity: `${variant.quantity} ${stock.size}`,
          status,
        });
      }

      continue;
    }

    if (stock.quantity === undefined) continue;

    const status = getStockAlertStatus(stock.quantity, stock.size, stockType);

    if (!status) continue;

    alerts.push({
      id: stock._id.toString(),
      stockId: stock._id.toString(),
      name: stock.name,
      brand: stock.brand,
      date: stock.updatedAt.toISOString(),
      quantity: `${stock.quantity} ${stock.size}`,
      status,
    });
  }

  return alerts;
};

export const dismissStockAlert = async (
  stockId: string,
  variantId?: string,
): Promise<"dismissed" | "not_found" | "invalid"> => {
  if (!mongoose.Types.ObjectId.isValid(stockId)) return "invalid";
  if (variantId && !mongoose.Types.ObjectId.isValid(variantId)) return "invalid";

  const result = variantId
    ? await Stock.updateOne(
        { _id: stockId, "variants._id": variantId },
        { $set: { "variants.$.showAlert": false } },
        { timestamps: false },
      )
    : await Stock.updateOne(
        { _id: stockId, variants: { $size: 0 } },
        { $set: { showAlert: false } },
        { timestamps: false },
      );

  return result.matchedCount === 0 ? "not_found" : "dismissed";
};
