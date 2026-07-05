import { Request, Response } from "express";

import { statusCodes } from "@/constants";
import { Stock } from "@/modules/stock/model";

import { Order, OrderVariant } from "../model";

export const getOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

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
    const { name, brand, price, variants } = req.body;

    if (!name || !brand || price) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Name, brand and price are required",
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "At least one variant is required",
      });
    }

    const order = await Order.create({
      name,
      brand,
      price,
      variants: variants.map((variant: OrderVariant) => ({
        ...variant,
        quantity: Number(variant.quantity),
      })),
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
    const { id, stockVariantId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    const orderVariant = order.variants.find((v) => v.stockVariantId.toString() === stockVariantId);

    if (!orderVariant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (orderVariant.isReturned) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Item is already returned",
      });
    }

    if (orderVariant.isClaimed) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Claimed item cannot be returned",
      });
    }

    const stock = await Stock.findById(order.stockId);

    if (!stock) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Stock not found",
      });
    }

    const stockVariant = stock.variants.find(
      (v) => v?._id && v._id.toString() === orderVariant.stockVariantId.toString(),
    );

    if (!stockVariant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Stock variant not found",
      });
    }

    stockVariant.quantity += orderVariant.quantity;

    orderVariant.isReturned = true;

    await stock.save();
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
    const { id, stockVariantId } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    const orderVariant = order.variants.find((v) => v.stockVariantId.toString() === stockVariantId);

    if (!orderVariant) {
      return res.status(statusCodes.NOT_FOUND).json({
        success: false,
        message: "Variant not found",
      });
    }

    if (orderVariant.isClaimed) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Item is already claimed",
      });
    }

    if (orderVariant.isReturned) {
      return res.status(statusCodes.BAD_REQUEST).json({
        success: false,
        message: "Returned item cannot be claimed",
      });
    }

    orderVariant.isClaimed = true;

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
