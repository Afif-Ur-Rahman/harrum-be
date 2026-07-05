import mongoose, { Document, Model } from "mongoose";

export type OrderVariant = {
  stockVariantId: mongoose.Types.ObjectId;
  color: string;
  quantity: number;
  isReturned?: boolean;
  isClaimed?: boolean;
};

export interface IOrder extends Document {
  stockId: mongoose.Types.ObjectId;
  name: string;
  brand: string;
  price: number;
  variants: OrderVariant[];
  createdBy: mongoose.Types.ObjectId;
}

type OrderModel = Model<IOrder>;

const variantSchema = new mongoose.Schema<OrderVariant>({
  stockVariantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StockVariant",
    required: [true, "Stock variant ID is required"],
  },
  color: {
    type: String,
    required: [true, "Color is required"],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0, "Quantity cannot be negative"],
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
});

const orderSchema = new mongoose.Schema<IOrder, OrderModel>(
  {
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: [true, "Stock ID is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator: (variants: OrderVariant[]) => variants.length > 0,
        message: "At least one variant is required",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ createdBy: 1 });

export const Order = mongoose.model<IOrder, OrderModel>("Order", orderSchema);
