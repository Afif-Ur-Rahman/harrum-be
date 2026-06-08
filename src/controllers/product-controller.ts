import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Product } from "@/models/product-model";
import { Stock } from "@/modules/stock/model";
import { IUser } from "@/modules/user/model";
import { catchAsync } from "@/utils";

export const createProduct = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { name, description, purchasePrice, sellingPrice, variants, brand, size } = req.body;
    const parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;

    const preparedVariants = [];

    for (const v of parsedVariants) {
      const qty = Number(v.quantity);

      if (qty < 0) {
        return res.status(statusCodes.BAD_REQUEST).json({
          message: "Quantity cannot be negative",
        });
      }

      let stock = await Stock.findOne({
        owner: owner._id,
        name,
        size: size || "",
        color: v.color || "",
        brand: brand || "",
      });

      if (stock) {
        stock.quantity += qty;
        stock.price = Number(sellingPrice);

        stock.stockHistory.push({
          price: Number(sellingPrice),
          quantity: qty,
          size: size || "",
          color: v.color,
          brand: brand || "",
          createdBy: owner._id,
          createdByName: owner.username || "Unknown",
          type: "stock-in",
        });

        await stock.save();
      } else {
        stock = await Stock.create({
          owner: owner._id,
          name,
          price: Number(sellingPrice),
          quantity: qty,
          size: size || "",
          color: v.color,
          brand: brand || "",
          createdBy: owner._id,
          stockHistory: [
            {
              price: Number(sellingPrice),
              quantity: qty,
              size: size || "",
              color: v.color,
              brand: brand || "",
              createdBy: owner._id,
              createdByName: owner.username || "Unknown",
              type: "stock-in",
              reason: "Product created",
            },
          ],
        });
      }

      preparedVariants.push({
        color: v.color,
        quantity: qty,
        stock: stock._id,
      });
    }

    const product = new Product({
      owner: owner._id,
      name,
      description,
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      brand: brand || "",
      size: size || "",
      variants: preparedVariants,
    });

    await product.save();

    return res.status(statusCodes.CREATED).json({
      message: "Product created successfully",
      data: product,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error creating product",
    });
  }
});

export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;

    const { name, description, purchasePrice, sellingPrice, variants, brand, size } = req.body;

    const product = await Product.findOne({ _id: id, owner: owner._id });
    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: "Product not found",
      });
    }

    const nextName = name ?? product.name;
    const nextDescription = description ?? product.description;
    const nextPurchasePrice = purchasePrice ?? product.purchasePrice;
    const nextSellingPrice = Number(sellingPrice ?? product.sellingPrice);
    const nextBrand = brand ?? product.brand ?? "";
    const nextSize = size ?? product.size ?? "";

    const parsedVariants = typeof variants === "string" ? JSON.parse(variants) : variants;

    if (parsedVariants && !Array.isArray(parsedVariants)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: "Variants must be an array",
      });
    }

    if (Array.isArray(parsedVariants)) {
      const oldVariantMap = new Map(
        product.variants.map((variant) => [variant.color || "", variant]),
      );

      const updatedVariants = [];

      for (const incomingVariant of parsedVariants) {
        const color = incomingVariant.color || "";
        const qty = Number(incomingVariant.quantity);

        if (Number.isNaN(qty) || qty < 0) {
          return res.status(statusCodes.BAD_REQUEST).json({
            message: "Quantity cannot be negative",
          });
        }

        const oldVariant = oldVariantMap.get(color);
        let stock = oldVariant?.stock
          ? await Stock.findOne({ _id: oldVariant.stock, owner: owner._id })
          : null;

        if (!stock) {
          stock = await Stock.findOne({
            owner: owner._id,
            name: nextName,
            size: nextSize,
            color,
            brand: nextBrand,
          });
        }

        if (!stock) {
          stock = await Stock.create({
            owner: owner._id,
            name: nextName,
            price: nextSellingPrice,
            quantity: 0,
            size: nextSize,
            color,
            brand: nextBrand,
            createdBy: owner._id,
            stockHistory: [],
          });
        }

        const oldQty = oldVariant ? oldVariant.quantity : 0;
        const diff = qty - oldQty;

        if (stock.quantity + diff < 0) {
          return res.status(statusCodes.BAD_REQUEST).json({
            message: "Stock cannot be negative",
          });
        }

        stock.name = nextName;
        stock.size = nextSize;
        stock.brand = nextBrand;
        stock.color = color;
        stock.price = nextSellingPrice;
        stock.quantity += diff;

        if (diff !== 0) {
          stock.stockHistory.push({
            price: nextSellingPrice,
            quantity: Math.abs(diff),
            size: nextSize,
            color,
            brand: nextBrand,
            createdBy: owner._id,
            createdByName: owner.username || "Unknown",
            type: diff > 0 ? "stock-in" : "wastage",
            reason: "Product updated",
          });
        }

        await stock.save();

        updatedVariants.push({
          color,
          quantity: qty,
          stock: stock._id,
        });

        oldVariantMap.delete(color);
      }

      for (const [, removedVariant] of oldVariantMap) {
        const removedStock = await Stock.findOne({
          _id: removedVariant.stock,
          owner: owner._id,
        });

        if (!removedStock) {
          continue;
        }

        if (removedStock.quantity - removedVariant.quantity < 0) {
          return res.status(statusCodes.BAD_REQUEST).json({
            message: "Stock cannot be negative",
          });
        }

        removedStock.quantity -= removedVariant.quantity;
        removedStock.stockHistory.push({
          price: nextSellingPrice,
          quantity: removedVariant.quantity,
          size: nextSize,
          color: removedVariant.color || "",
          brand: nextBrand,
          createdBy: owner._id,
          createdByName: owner.username || "Unknown",
          type: "wastage",
          reason: "Variant removed from product",
        });

        await removedStock.save();
      }

      product.variants = updatedVariants;
    }

    product.name = nextName;
    product.description = nextDescription;
    product.purchasePrice = Number(nextPurchasePrice);
    product.sellingPrice = nextSellingPrice;
    product.brand = nextBrand;
    product.size = nextSize;

    await product.save();

    return res.status(statusCodes.OK).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error updating product",
    });
  }
});

export const getProducts = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const products = await Product.find({ owner: owner._id });
    if (!products || products.length === 0) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "No products found",
      });
    }
    res.status(statusCodes.OK).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
    });
  } catch (error: Error | any) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
});

export const getProductById = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, owner: owner._id });
    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }
    res.status(statusCodes.OK).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error: Error | any) {
    res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
});

export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  try {
    const owner = req.user as IUser;
    const { id } = req.params;

    const product = await Product.findOne({
      _id: id,
      owner: owner._id,
    });

    if (!product) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Product not found",
      });
    }
    const stockIds = product.variants.map((variant) => variant.stock);
    await Stock.deleteMany({ _id: { $in: stockIds }, owner: owner._id });
    await product.deleteOne();

    return res.status(statusCodes.OK).json({
      message: "Product deleted successfully",
      data: product,
    });
  } catch (error: Error | any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Something went wrong",
    });
  }
});
