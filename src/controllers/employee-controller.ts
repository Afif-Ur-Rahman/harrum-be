import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { IEmployee } from "@/models/employee-model";
import { Product } from "@/models/product-model";
import { Stock } from "@/modules/stock/model/stock-model";
import { catchAsync } from "@/utils";

export const sellProduct = catchAsync(async (req: Request, res: Response) => {
  try {
    const employee = req.user as unknown as IEmployee;

    const { productId, quantity, color } = req.body;

    // Permission check
    if (employee.type !== "worker" && employee.type !== "accountant") {
      return res.status(statusCodes.FORBIDDEN).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    // Validate quantity
    if (!quantity || Number(quantity) <= 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find product variant
    const variant = product.variants.find((v) => (v.color || "") === (color || ""));

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    // Check variant stock
    if (variant.quantity < Number(quantity)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    // Find real stock document
    const stock = await Stock.findById(variant.stock);

    if (!stock) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Stock not found",
      });
    }

    // Check stock quantity
    if (stock.quantity < Number(quantity)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Insufficient stock quantity",
      });
    }

    // Update product variant quantity
    variant.quantity -= Number(quantity);

    // Update stock quantity
    stock.quantity -= Number(quantity);

    // Add stock history
    const createdByName = (employee.username as string) || employee.email || "Unknown";
    stock.stockHistory.push({
      price: product.sellingPrice,
      quantity: Number(quantity),
      size: product.size || "",
      color: variant.color || "",
      brand: product.brand || "",
      createdBy: employee._id,
      createdByName,
    });

    // Save updates
    await stock.save();
    await product.save();

    // Calculate total price
    const totalPrice = product.sellingPrice * Number(quantity);

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Product sold successfully",
      totalPrice,
      data: {
        product,
        stock,
      },
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
});
