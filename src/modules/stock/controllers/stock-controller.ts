import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants";
import { Vendor } from "@/modules";

import { IStock, NO_COLOR_VARIANT_TYPES, Stock, StockVariant } from "../model";

export const getStocks = async (_req: Request, res: Response) => {
  try {
    const stocks = await Stock.find().sort({ createdAt: -1 });

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Stocks fetched successfully",
      data: stocks,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch stocks",
    });
  }
};

export const createStock = async (req: Request, res: Response) => {
  try {
    const { stockItems } = req.body;

    if (!Array.isArray(stockItems) || stockItems.length === 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Stock items are required",
      });
    }

    const vendorTotals = new Map<string, number>();

    await Promise.all(
      stockItems.map(async (item: IStock & { _id?: string }) => {
        const skipColorVariants = NO_COLOR_VARIANT_TYPES.includes(item.type);

        const vendorId = item.vendor ? String(item.vendor) : "";

        if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
          throw new Error("A valid vendor is required");
        }

        const vendorExists = await Vendor.exists({ _id: vendorId });

        if (!vendorExists) {
          throw new Error(`Vendor not found with id: ${vendorId}`);
        }

        const quantity = Number(item.quantity || 0);

        const variants =
          item.variants?.map((variant) => ({
            color: variant.color,
            quantity: Number(variant.quantity),
          })) || [];

        if (skipColorVariants) {
          if (!item.quantity || quantity <= 0) {
            throw new Error("Quantity is required");
          }
        } else if (!variants.length) {
          throw new Error("At least one variant is required");
        }

        const purchasePrice = Number(item.purchasePrice || 0);

        const purchasedQuantity = skipColorVariants
          ? quantity
          : variants.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0);

        const purchaseAmount = purchasedQuantity * purchasePrice;

        vendorTotals.set(vendorId, (vendorTotals.get(vendorId) || 0) + purchaseAmount);

        if (item._id) {
          const existingStock = await Stock.findById(item._id);

          if (!existingStock) {
            throw new Error(`Stock not found with id: ${item._id}`);
          }

          existingStock.name = item.name;
          existingStock.brand = item.brand;
          existingStock.vendor = new mongoose.Types.ObjectId(vendorId);
          existingStock.type = item.type;
          existingStock.size = item.size;
          existingStock.purchasePrice = item.purchasePrice;
          existingStock.wholesalePrice = item.wholesalePrice;
          existingStock.salePrice = item.salePrice;

          if (skipColorVariants) {
            existingStock.quantity = Number(existingStock.quantity || 0) + quantity;

            existingStock.variants = [];
          } else {
            variants.forEach((newVariant) => {
              const existingVariant = existingStock.variants.find(
                (variant: StockVariant) =>
                  variant.color.toLowerCase() === newVariant.color.toLowerCase(),
              );

              if (existingVariant) {
                existingVariant.quantity =
                  Number(existingVariant.quantity || 0) + Number(newVariant.quantity);
              } else {
                existingStock.variants.push(newVariant);
              }
            });

            existingStock.quantity = undefined;
          }

          existingStock.history.push({
            vendor: new mongoose.Types.ObjectId(vendorId),
            purchasePrice: item.purchasePrice,
            wholesalePrice: item.wholesalePrice,
            salePrice: item.salePrice,
            quantity: skipColorVariants ? quantity : undefined,
            variants: skipColorVariants ? [] : variants,
            date: new Date(),
          });

          await existingStock.save();
          return;
        }

        await new Stock({
          name: item.name,
          brand: item.brand,
          vendor: new mongoose.Types.ObjectId(vendorId),
          purchasePrice: item.purchasePrice,
          wholesalePrice: item.wholesalePrice,
          salePrice: item.salePrice,
          type: item.type,
          size: item.size,
          quantity: skipColorVariants ? quantity : undefined,
          variants: skipColorVariants ? [] : variants,
          history: [
            {
              vendor: new mongoose.Types.ObjectId(vendorId),
              purchasePrice: item.purchasePrice,
              wholesalePrice: item.wholesalePrice,
              salePrice: item.salePrice,
              quantity: skipColorVariants ? quantity : undefined,
              variants: skipColorVariants ? [] : variants,
            },
          ],
        }).save();
      }),
    );

    await Promise.all(
      Array.from(vendorTotals.entries())
        .filter(([, amount]) => amount > 0)
        .map(([vendorId, amount]) =>
          Vendor.findByIdAndUpdate(vendorId, { $inc: { remainingAmount: amount } }),
        ),
    );

    const stock = await Stock.find().sort({ createdAt: -1 });

    return res.status(statusCodes.CREATED).json({
      success: true,
      message: "Stock saved successfully",
      data: stock,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        success: false,
        message: "Stock with this name and brand already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to save stock",
    });
  }
};
