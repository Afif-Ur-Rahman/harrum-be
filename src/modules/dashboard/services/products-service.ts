import { Order } from "@/modules/orders/model";

import { DateRange } from "../utils";

export interface TopProductItem {
  stockId: string;
  name: string;
  size?: string;
  units: number;
  revenue: number;
  share: number;
}

const TOP_PRODUCTS_LIMIT = 5;

export const getTopProducts = async (
  range: DateRange,
  limit = TOP_PRODUCTS_LIMIT,
): Promise<{ products: TopProductItem[]; totalUnits: number }> => {
  const { start, end } = range;

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    { $unwind: "$items" },
    {
      $project: {
        stockId: "$items.stockId",
        name: "$items.name",
        size: "$items.size",
        lines: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$items.variants", []] } }, 0] },
            {
              $map: {
                input: {
                  $filter: {
                    input: "$items.variants",
                    as: "v",
                    cond: { $ne: ["$$v.isReturned", true] },
                  },
                },
                as: "v",
                in: { quantity: "$$v.quantity", amount: "$$v.price" },
              },
            },
            {
              $cond: [
                { $eq: ["$items.isReturned", true] },
                [],
                [{ quantity: "$items.quantity", amount: "$items.price" }],
              ],
            },
          ],
        },
      },
    },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$stockId",
        name: { $first: "$name" },
        size: { $first: "$size" },
        units: { $sum: { $ifNull: ["$lines.quantity", 0] } },
        revenue: { $sum: { $ifNull: ["$lines.amount", 0] } },
      },
    },
    { $match: { units: { $gt: 0 } } },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);

  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);

  const products: TopProductItem[] = rows.map((row) => ({
    stockId: String(row._id),
    name: row.name,
    size: row.size,
    units: row.units,
    revenue: row.revenue,
    share: totalUnits ? Math.round((row.units / totalUnits) * 100) : 0,
  }));

  return { products, totalUnits };
};
