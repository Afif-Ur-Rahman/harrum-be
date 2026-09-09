import { Request, Response } from "express";
import mongoose from "mongoose";

import { statusCodes } from "@/constants";
import { Customer, Stock } from "@/modules";

import { Order, OrderItem, OrderVariant } from "../model";

export const getOrders = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 30, 1);
    const search = (req.query.search as string)?.trim();
    const customerId = (req.query.customerId as string)?.trim();

    const filter: Record<string, unknown> = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ customerName: regex }, { phone: regex }, { email: regex }];
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("salesman", "username email")
        .populate("createdBy", "username email"),
      Order.countDocuments(filter),
    ]);

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Orders fetched successfully",
      data: {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const createdBy = req.user?._id;
    const { customerName, email, phone, salesmanId, discount, items, isPaid } = req.body;

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
    const isPaidFlag = Boolean(isPaid);

    let createdOrder: any;
    let updatedStocks: any[] = [];
    let notFoundMessage: string | null = null;

    await session.withTransaction(async () => {
      const stockDocs = new Map<string, any>();

      for (const item of normalizedItems) {
        const stockKey = item.stockId.toString();
        let stock = stockDocs.get(stockKey);

        if (!stock) {
          stock = await Stock.findById(item.stockId).session(session);

          if (!stock) {
            notFoundMessage = `Stock not found for item "${item.name}"`;
            throw new Error(notFoundMessage);
          }

          stockDocs.set(stockKey, stock);
        }

        for (const variant of item.variants) {
          const stockVariant = stock.variants.find(
            (v: any) => v.color.toLowerCase() === variant.color.toLowerCase(),
          );

          if (!stockVariant) {
            notFoundMessage = `Color "${variant.color}" not found for "${item.name}"`;
            throw new Error(notFoundMessage);
          }

          if (stockVariant.quantity < variant.quantity) {
            notFoundMessage = `Insufficient stock for "${item.name}" (${variant.color}). Available: ${stockVariant.quantity}`;
            throw new Error(notFoundMessage);
          }

          stockVariant.quantity -= variant.quantity;
        }
      }

      // ── Customer: find-or-create, keyed by unique phone ──────────
      let customer = await Customer.findOne({ phone }).session(session);

      if (!customer) {
        const created = await Customer.create(
          [
            {
              name: customerName,
              phone,
              email,
              remainingAmount: isPaidFlag ? 0 : totalPrice,
            },
          ],
          { session },
        );
        customer = created[0];
      } else if (!isPaidFlag) {
        customer.remainingAmount = (customer.remainingAmount || 0) + totalPrice;
        await customer.save({ session });
      }

      // ── Order ─────────────────────────────────────────────────────
      const orderDocs = await Order.create(
        [
          {
            customerName,
            email,
            phone,
            customerId: customer._id,
            isPaid: isPaidFlag,
            salesman: salesmanId,
            items: normalizedItems,
            discount: safeDiscount,
            totalPrice,
            createdBy,
          },
        ],
        { session },
      );
      createdOrder = orderDocs[0];

      // ── Stock saves (deducted quantities) ───────────────────────
      updatedStocks = await Promise.all(
        Array.from(stockDocs.values()).map((stock) => stock.save({ session })),
      );
    });

    return res.status(statusCodes.CREATED).json({
      success: true,
      message: "Order created successfully",
      data: createdOrder,
      updatedStocks,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  } finally {
    await session.endSession();
  }
};

export const returnOrderItem = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { id, itemId, variantId } = req.params;

    let updatedOrder: any;
    let updatedStock: any = null;

    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);

      if (!order) {
        throw new Error("Order not found");
      }

      const item = order.items.find((i: any) => i._id.toString() === itemId);

      if (!item) {
        throw new Error("Item not found");
      }

      const variant = item.variants.find((v: any) => v._id.toString() === variantId);

      if (!variant) {
        throw new Error("Variant not found");
      }

      if (variant.isReturned) {
        throw new Error("Item is already returned");
      }

      if (variant.isClaimed) {
        throw new Error("Claimed item cannot be returned");
      }

      variant.isReturned = true;

      const stock = await Stock.findById(item.stockId).session(session);

      if (stock) {
        const stockVariant = stock.variants.find(
          (v: any) => v.color.toLowerCase() === variant.color.toLowerCase(),
        );

        if (stockVariant) {
          stockVariant.quantity += variant.quantity;
        } else {
          stock.variants.push({ color: variant.color, quantity: variant.quantity } as any);
        }

        updatedStock = await stock.save({ session });
      }

      updatedOrder = await order.save({ session });
    });

    return res.status(statusCodes.OK).json({
      success: true,
      message: "Item returned successfully",
      data: updatedOrder,
      updatedStock,
    });
  } catch (error: any) {
    return res.status(statusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || "Failed to return item",
    });
  } finally {
    await session.endSession();
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
