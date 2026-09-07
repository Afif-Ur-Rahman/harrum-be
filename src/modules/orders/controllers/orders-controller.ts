import { Request, Response } from "express";

import { statusCodes } from "@/constants";

import { Order, OrderItem, OrderVariant } from "../model";

export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("salesman", "username email")
      .populate("createdBy", "username email");

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const createdBy = req.user?._id;
    const { customerName, email, phone, salesmanId, discount, items } = req.body;

    if (!customerName || !phone || !salesmanId) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Customer name, phone and salesman are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "At least one item is required",
      });
    }

    const normalizedItems: OrderItem[] = items.map((item: OrderItem) => {
      if (!item.stockId || !item.name) {
        throw new Error("Each item must have a stock and name");
      }

      if (!Array.isArray(item.variants) || item.variants.length === 0) {
        throw new Error("Each item must have at least one color variant");
      }

      return {
        stockId: item.stockId,
        name: item.name,
        priceType: item.priceType || "sale",
        variants: item.variants.map((variant: OrderVariant) => {
          const quantity = Number(variant.quantity);
          const price = Number(variant.price);

          if (!variant.color) {
            throw new Error("Color is required for every variant");
          }

          if (!quantity || quantity <= 0) {
            throw new Error("Quantity must be greater than 0");
          }

          return {
            color: variant.color,
            quantity,
            price: isNaN(price) ? 0 : price,
          };
        }),
      };
    });

    const itemsTotal = normalizedItems.reduce(
      (sum, item) => sum + item.variants.reduce((vSum, variant) => vSum + variant.price, 0),
      0,
    );

    const safeDiscount = Number(discount) || 0;
    const totalPrice = Math.max(itemsTotal - safeDiscount, 0);

    const order = await Order.create({
      customerName,
      email,
      phone,
      salesman: salesmanId,
      items: normalizedItems,
      discount: safeDiscount,
      totalPrice,
      createdBy,
    });

    return res.status(statusCodes.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

export const returnOrderItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId, variantId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find((i: any) => i._id.toString() === itemId);

    if (!item) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Item not found",
      });
    }

    const variant = item.variants.find((v: any) => v._id.toString() === variantId);

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (variant.isReturned) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Item is already returned",
      });
    }

    if (variant.isClaimed) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Claimed item cannot be returned",
      });
    }

    variant.isReturned = true;

    await order.save();

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Item returned successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to return item",
    });
  }
};

export const claimOrderItem = async (req: Request, res: Response) => {
  try {
    const { id, itemId, variantId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find((i: any) => i._id.toString() === itemId);

    if (!item) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Item not found",
      });
    }

    const variant = item.variants.find((v: any) => v._id.toString() === variantId);

    if (!variant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (variant.isClaimed) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Item is already claimed",
      });
    }

    if (variant.isReturned) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Returned item cannot be claimed",
      });
    }

    variant.isClaimed = true;

    await order.save();

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Item claimed successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to claim item",
    });
  }
};
