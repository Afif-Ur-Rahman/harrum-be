import { Request, Response } from "express";

import { statusCodes } from "@/constants";

import { IStock, Stock, StockVariant } from "../model";

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

    await Promise.all(
      stockItems.map(async (item: IStock & { _id?: string }) => {
        const variants = item.variants?.map((variant) => ({
          color: variant.color,
          quantity: Number(variant.quantity),
        }));

        if (!variants?.length) {
          throw new Error("At least one variant is required");
        }

        if (item._id) {
          const existingStock = await Stock.findById(item._id);

          if (!existingStock) {
            throw new Error(`Stock not found with id: ${item._id}`);
          }

          existingStock.name = item.name;
          existingStock.brand = item.brand;
          existingStock.type = item.type;
          existingStock.size = item.size;
          existingStock.purchasePrice = item.purchasePrice;
          existingStock.wholesalePrice = item.wholesalePrice;
          existingStock.salePrice = item.salePrice;

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

          existingStock.history.push({
            purchasePrice: item.purchasePrice,
            wholesalePrice: item.wholesalePrice,
            salePrice: item.salePrice,
            variants,
            date: new Date(),
          });

          await existingStock.save();
          return;
        }

        await new Stock({
          name: item.name,
          brand: item.brand,
          purchasePrice: item.purchasePrice,
          wholesalePrice: item.wholesalePrice,
          salePrice: item.salePrice,
          type: item.type,
          size: item.size,
          variants,
          history: [
            {
              purchasePrice: item.purchasePrice,
              wholesalePrice: item.wholesalePrice,
              salePrice: item.salePrice,
              variants,
            },
          ],
        }).save();
      }),
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
