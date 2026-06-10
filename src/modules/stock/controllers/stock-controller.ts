import { Request, Response } from "express";

import { statusCodes } from "@/constants";

import { IStock, Stock } from "../model";

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

    await Promise.all(
      stockItems.map((item: IStock) =>
        new Stock({
          name: item.name,
          brand: item.brand,
          article: item.article,
          wholesalePrice: item.wholesalePrice,
          salePrice: item.salePrice,
          size: item.size,
          variants: item.variants,
          history: [
            {
              wholesalePrice: item.wholesalePrice,
              salePrice: item.salePrice,
              variants: item.variants,
            },
          ],
        }).save(),
      ),
    );

    const stock = await Stock.find().sort({ createdAt: -1 });

    return res.status(statusCodes.CREATED).json({
      success: true,
      message: "Stock created successfully",
      data: stock,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(statusCodes.CONFLICT).json({
        success: false,
        message: "Stock with this brand and article already exists",
      });
    }

    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to create stock",
    });
  }
};
