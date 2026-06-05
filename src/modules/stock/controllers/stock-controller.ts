import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants/statusCodes";
import { catchAsync } from "@/utils/catch-async";

import { Stock, StockHistory } from "../model/stock-model";

export const createStock = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as any;

  const restaurantId =
    user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

  const { stockItems } = req.body;

  if (!Array.isArray(stockItems) || stockItems.length === 0) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "stockItems must be a non-empty array" });
  }

  // Fetch actual current DB state for all existing stocks to avoid stale form data
  const existingIds = stockItems.filter((i: any) => i._id).map((i: any) => i._id);
  const existingStocks = existingIds.length
    ? await Stock.find({ _id: { $in: existingIds } }).lean()
    : [];
  const stockMap = new Map((existingStocks as any[]).map((s) => [s._id.toString(), s]));

  const bulkOps: any[] = [];

  for (const item of stockItems) {
    const { _id, name, newQuantity, newPrice } = item;

    const newQty = Number(newQuantity) || 0;
    const newTotalPrice = Number(newPrice) || 0;

    if (newQty <= 0) continue; // skip zero/negative quantity items — nothing to write

    const newPricePerUnit = newTotalPrice / newQty;

    if (_id) {
      // Use actual DB values — not stale form fields — for WAC calculation
      const current = stockMap.get(_id.toString());
      const currentQty = current ? Number(current.quantity) || 0 : 0;
      const currentPrice = current ? Number(current.price) || 0 : 0;
      const totalQuantity = currentQty + newQty;
      const avgPricePerUnit =
        totalQuantity > 0
          ? (currentQty * currentPrice + newQty * newPricePerUnit) / totalQuantity
          : newPricePerUnit;

      bulkOps.push({
        updateOne: {
          filter: { _id },
          update: {
            $inc: { quantity: newQty }, // $inc prevents overwriting concurrent changes
            $set: {
              price: avgPricePerUnit,
              size: item.size,
              brand: item.brand,
              color: item.color,
              createdBy: user._id,
            },
            $push: {
              stockHistory: {
                $each: [
                  {
                    price: newPricePerUnit,
                    quantity: newQty,
                    size: item.size,
                    brand: item.brand,
                    color: item.color,
                    createdBy: user._id,
                    createdByName: user.fullName || user.username || "Unknown",
                    type: "stock-in",
                  },
                ],
                $slice: -500, // keep last 500 entries to prevent unbounded document growth
              },
            },
          },
        },
      });
    } else {
      bulkOps.push({
        insertOne: {
          document: {
            name,
            price: newPricePerUnit,
            quantity: newQty,
            size: item.size,
            brand: item.brand,
            color: item.color,
            restaurant: restaurantId,
            createdBy: user._id,
            stockHistory: [
              {
                price: newPricePerUnit,
                quantity: newQty,
                size: item.size,
                brand: item.brand,
                color: item.color,
                createdBy: user._id,
                createdByName: user.fullName || user.username || "Unknown",
                type: "stock-in",
              },
            ],
          },
        },
      });
    }
  }

  if (bulkOps.length === 0) {
    return res.status(statusCodes.CREATED).json({
      message: "Stock processed successfully",
      data: [],
    });
  }

  await Stock.bulkWrite(bulkOps);

  // Return only affected stocks instead of the full collection
  const affectedIds = stockItems.filter((i: any) => i._id).map((i: any) => i._id);
  const newNames = stockItems.filter((i: any) => !i._id).map((i: any) => i.name);
  const orClauses = [
    ...(affectedIds.length ? [{ _id: { $in: affectedIds }, restaurant: restaurantId }] : []),
    ...(newNames.length ? [{ restaurant: restaurantId, name: { $in: newNames } }] : []),
  ];
  const stocks = await Stock.find(orClauses.length ? { $or: orClauses } : { _id: { $in: [] } })
    .populate({ path: "createdBy", select: "fullName username type" })
    .populate({ path: "stockHistory.createdBy", select: "fullName username type" })
    .lean();

  return res.status(statusCodes.CREATED).json({
    message: "Stock processed successfully",
    data: stocks,
  });
});

export const getStocks = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as any;

  const restaurantId =
    user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

  const { search, limit } = req.query;
  const pageLimit = Math.min(Number(limit) || 200, 500);

  const filter: any = { restaurant: restaurantId };
  if (search && typeof search === "string" && search.trim()) {
    filter.name = { $regex: search.trim(), $options: "i" };
  }

  const stocks = await Stock.find(filter)
    .sort({ name: 1 })
    .limit(pageLimit)
    .populate({
      path: "createdBy",
      select: "fullName username type",
    })
    .populate({
      path: "stockHistory.createdBy",
      select: "fullName username type",
    })
    .lean();

  const transformedStocks = (stocks || []).map((stock: any) => {
    return {
      ...stock,
      quantity: typeof stock.quantity === "number" ? stock.quantity : Number(stock.quantity) || 0,
      stockHistory: (stock.stockHistory || [])
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((history: any) => ({
          ...history,
          quantity:
            typeof history.quantity === "number" ? history.quantity : Number(history.quantity) || 0,
        })),
    };
  });

  return res.status(statusCodes.OK).json({
    message: "Stocks fetched successfully",
    data: transformedStocks,
  });
});

export const updateStockHistory = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id, historyId } = req.params;
      const user = req.user as any;
      const { price, quantity, unit } = req.body;

      const restaurantId =
        user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

      const stock = await Stock.findOne({ _id: id, restaurant: restaurantId });

      if (!stock) {
        return res.status(statusCodes.NOT_FOUND).json({
          message: "Stock not found",
        });
      }

      stock.stockHistory = stock.stockHistory.map((history: StockHistory) => {
        if (history._id?.toString() === historyId) {
          return {
            ...history,
            price: price === undefined ? history.price : Number(price),
            quantity: quantity === undefined ? history.quantity : Number(quantity),
            size: unit || history.size,
            brand: history.brand,
            color: history.color,
            createdBy: user._id,
          };
        }
        return history;
      });

      // quantity = sum of ALL entries (stock-in positive, order/wastage negative)
      // WAC price = weighted avg of stock-in entries only; order/wastage don't change the avg cost
      let totalQuantity = 0;
      let stockInQty = 0;
      let stockInValue = 0;

      for (const history of stock.stockHistory) {
        const qty = Number(history.quantity) || 0;
        totalQuantity += qty;
        if ((history as any).type === "stock-in") {
          stockInQty += qty;
          stockInValue += qty * (Number(history.price) || 0);
        }
      }

      stock.quantity = totalQuantity;
      stock.price = stockInQty > 0 ? stockInValue / stockInQty : 0;

      await stock.save();
      await stock.populate({
        path: "stockHistory.createdBy",
        select: "fullName username type",
      });

      await stock.populate({
        path: "createdBy",
        select: "fullName username type",
      });

      stock.stockHistory.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      return res.status(statusCodes.OK).json({
        message: "Stock updated successfully",
        data: stock,
      });
    } catch (error: Error | any) {
      return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message || "Error updating stock",
        error,
      });
    }
  },
);

export const deleteStock = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    if (user.type !== "restaurant") {
      return res.status(statusCodes.FORBIDDEN).json({
        message: "You are not allowed to delete stocks",
      });
    }

    const stock = await Stock.findOneAndDelete({ _id: id, restaurant: user._id });

    if (!stock) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Stock not found",
      });
    }

    return res.status(statusCodes.OK).json({
      message: "Stock deleted successfully",
      data: stock,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error deleting stock",
      error,
    });
  }
});

export const deleteStockHistory = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { id, historyId } = req.params;
    const user = req.user as any;

    const restaurantId =
      user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

    const stock = await Stock.findOne({ _id: id, restaurant: restaurantId });

    if (!stock) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Stock not found",
      });
    }

    stock.stockHistory = stock.stockHistory.filter((h: any) => h._id?.toString() !== historyId);

    // quantity = sum of ALL entries; WAC price = weighted avg of stock-in entries only
    let totalQuantity = 0;
    let stockInQty = 0;
    let stockInValue = 0;

    for (const history of stock.stockHistory) {
      const qty = Number(history.quantity) || 0;
      totalQuantity += qty;
      if ((history as any).type === "stock-in") {
        stockInQty += qty;
        stockInValue += qty * (Number(history.price) || 0);
      }
    }

    const avgPricePerUnit = stockInQty > 0 ? stockInValue / stockInQty : 0;

    stock.quantity = totalQuantity;
    stock.price = avgPricePerUnit;

    await stock.save();
    await stock.populate({
      path: "createdBy",
      select: "fullName username type",
    });
    await stock.populate({
      path: "stockHistory.createdBy",
      select: "fullName username type",
    });

    stock.stockHistory = stock.stockHistory.sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return res.status(statusCodes.OK).json({
      message: "Stock history deleted",
      data: stock,
    });
  },
);

export const stockOut = catchAsync(async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as any;

  const restaurantId =
    user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

  const { stockItems, reason } = req.body;

  if (!Array.isArray(stockItems) || stockItems.length === 0) {
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: "stockItems must be a non-empty array" });
  }

  const validItems = (stockItems as any[]).filter(
    (item) => item._id && Number(item.newQuantity) > 0,
  );

  if (!validItems.length) {
    return res.status(statusCodes.BAD_REQUEST).json({ message: "No valid stock items provided" });
  }

  // Single query for all stocks — no N+1
  const ids = validItems.map((item) => item._id);
  const currentStocks = await Stock.find({ _id: { $in: ids }, restaurant: restaurantId }).lean();
  const stockMap = new Map((currentStocks as any[]).map((s) => [s._id.toString(), s]));

  // Validate all before any write
  for (const item of validItems) {
    const outQty = Number(item.newQuantity);
    const stock = stockMap.get(item._id.toString());
    if (!stock) continue;
    if (stock.quantity < outQty) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Not enough stock for ${stock.name}`,
      });
    }
  }

  const historyType: "order" | "wastage" =
    reason?.startsWith("Dine In #") ||
    reason?.startsWith("Delivery ·") ||
    reason?.startsWith("Item removed")
      ? "order"
      : "wastage";

  const bulkOps = validItems
    .filter((item) => stockMap.has(item._id.toString()))
    .map((item) => {
      const outQty = Number(item.newQuantity);
      const stock = stockMap.get(item._id.toString());
      return {
        updateOne: {
          filter: { _id: item._id, restaurant: restaurantId },
          update: {
            $inc: { quantity: -outQty },
            $push: {
              stockHistory: {
                $each: [
                  {
                    quantity: -outQty,
                    price: stock.price,
                    size: stock.size,
                    brand: stock.brand,
                    color: stock.color,
                    createdBy: user._id,
                    createdByName: user.fullName || user.username || "Unknown",
                    date: new Date(),
                    type: historyType,
                    reason: reason || undefined,
                  },
                ],
                $slice: -500,
              },
            },
          },
        },
      };
    });

  await Stock.bulkWrite(bulkOps);

  // Return only affected stocks, scoped to this restaurant
  const affectedStocks = await Stock.find({ _id: { $in: ids }, restaurant: restaurantId })
    .populate({ path: "createdBy", select: "fullName username type" })
    .populate({ path: "stockHistory.createdBy", select: "fullName username type" })
    .lean();

  return res.status(statusCodes.CREATED).json({
    message: "Stock out processed successfully",
    data: affectedStocks,
  });
});

export const getStockHistory = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = req.user as any;
    const restaurantId =
      user.type === "restaurant" ? user._id?.toString() : user.restaurant?.toString();

    // Aggregation $match does NOT auto-cast strings → ObjectId like find() does
    const restaurantObjectId = mongoose.Types.ObjectId.createFromHexString(restaurantId);

    const { from, to, type, page = "1", limit = "50" } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageLimit = Math.min(parseInt(limit, 10) || 50, 500);

    const historyMatch: any = {};
    if (from || to) {
      historyMatch["stockHistory.date"] = {};
      if (from) historyMatch["stockHistory.date"].$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        historyMatch["stockHistory.date"].$lte = toDate;
      }
    }
    if (type && type !== "all") {
      historyMatch["stockHistory.type"] = type;
    }

    const pipeline: any[] = [
      { $match: { restaurant: restaurantObjectId } },
      { $unwind: "$stockHistory" },
      ...(Object.keys(historyMatch).length ? [{ $match: historyMatch }] : []),
      { $sort: { "stockHistory.date": -1 } },
    ];

    const [countResult, entries] = await Promise.all([
      Stock.aggregate([...pipeline, { $count: "total" }]),
      Stock.aggregate([
        ...pipeline,
        { $skip: (pageNum - 1) * pageLimit },
        { $limit: pageLimit },
        {
          $project: {
            _id: 0,
            stockId: "$_id",
            stockName: "$name",
            unit: "$stockHistory.unit",
            quantity: "$stockHistory.quantity",
            price: "$stockHistory.price",
            type: "$stockHistory.type",
            reason: "$stockHistory.reason",
            date: "$stockHistory.date",
            createdByName: "$stockHistory.createdByName",
            historyId: "$stockHistory._id",
          },
        },
      ]),
    ]);

    const total = countResult[0]?.total ?? 0;

    return res.status(statusCodes.OK).json({
      message: "Stock history fetched successfully",
      data: {
        entries,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  },
);
