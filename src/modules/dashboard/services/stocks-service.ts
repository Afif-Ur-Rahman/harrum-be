import { Stock } from "@/modules/stock";

export type StockAlertStatus = "Critical" | "Low" | "Moderate";

export interface StockAlertItem {
  id: string;
  name: string;
  brand: string;
  color?: string;
  date: string;
  quantity: string;
  threshold: string;
  status: StockAlertStatus;
}

const getStockAlertStatus = (
  quantity: number,
  size: string,
): {
  status: StockAlertStatus;
  threshold: number;
} | null => {
  const normalizedSize = size.toLowerCase().trim();

  // Meters
  if (normalizedSize.includes("meter") || normalizedSize === "m") {
    if (quantity <= 4.5) {
      return {
        status: "Critical",
        threshold: 4.5,
      };
    }

    if (quantity <= 9) {
      return {
        status: "Low",
        threshold: 9,
      };
    }

    return null;
  }

  // Pieces
  if (normalizedSize.includes("piece") || normalizedSize === "pcs" || normalizedSize === "pc") {
    if (quantity < 2) {
      return {
        status: "Critical",
        threshold: 2,
      };
    }

    if (quantity === 2) {
      return {
        status: "Low",
        threshold: 2,
      };
    }

    return null;
  }

  // Gaz
  if (normalizedSize.includes("gaz")) {
    if (quantity <= 7) {
      return {
        status: "Critical",
        threshold: 7,
      };
    }

    if (quantity <= 14) {
      return {
        status: "Low",
        threshold: 14,
      };
    }

    return null;
  }

  return null;
};

export const getStockAlerts = async (): Promise<StockAlertItem[]> => {
  const stocks = await Stock.find({
    $or: [
      { "variants.showAlert": { $ne: false } },
      {
        variants: { $size: 0 },
        quantity: { $exists: true },
      },
    ],
  })
    .select("name brand size quantity variants updatedAt")
    .lean();

  const alerts: StockAlertItem[] = [];

  for (const stock of stocks) {
    // Stocks with variants
    if (stock.variants?.length) {
      for (const variant of stock.variants) {
        // Explicitly disabled alert
        if (variant.showAlert === false) continue;

        const result = getStockAlertStatus(variant.quantity, stock.size);

        if (!result) continue;

        alerts.push({
          id: variant._id?.toString() || stock._id.toString(),
          name: stock.name,
          brand: stock.brand,
          color: variant.color,
          date: stock.updatedAt.toISOString(),
          quantity: `${variant.quantity} ${stock.size}`,
          threshold: `${result.threshold} ${stock.size}`,
          status: result.status,
        });
      }

      continue;
    }

    // Stocks without variants
    if (stock.quantity === undefined) continue;

    const result = getStockAlertStatus(stock.quantity, stock.size);

    if (!result) continue;

    alerts.push({
      id: stock._id.toString(),
      name: stock.name,
      brand: stock.brand,
      date: stock.updatedAt.toISOString(),
      quantity: `${stock.quantity} ${stock.size}`,
      threshold: `${result.threshold} ${stock.size}`,
      status: result.status,
    });
  }

  return alerts;
};
