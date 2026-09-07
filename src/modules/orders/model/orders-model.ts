import mongoose, { Document, Model } from "mongoose";

export type OrderVariant = {
  _id?: mongoose.Types.ObjectId;
  color: string;
  quantity: number;
  price: number;
  isReturned?: boolean;
  isClaimed?: boolean;
};

export type OrderItem = {
  _id?: mongoose.Types.ObjectId;
  stockId: mongoose.Types.ObjectId;
  name: string;
  priceType: "purchase" | "wholesale" | "sale";
  variants: OrderVariant[];
};

export interface IOrder extends Document {
  customerName: string;
  email?: string;
  phone: string;
  salesman: mongoose.Types.ObjectId;
  items: OrderItem[];
  discount: number;
  totalPrice: number;
  createdBy: mongoose.Types.ObjectId;
}

type OrderModel = Model<IOrder>;

const orderVariantSchema = new mongoose.Schema<OrderVariant>({
  color: {
    type: String,
    required: [true, "Color is required"],
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: [0, "Price cannot be negative"],
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

const orderItemSchema = new mongoose.Schema<OrderItem>({
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
  priceType: {
    type: String,
    enum: ["purchase", "wholesale", "sale"],
    default: "sale",
  },
  variants: {
    type: [orderVariantSchema],
    default: [],
    validate: {
      validator: (variants: OrderVariant[]) => variants.length > 0,
      message: "At least one color variant is required",
    },
  },
});

const orderSchema = new mongoose.Schema<IOrder, OrderModel>(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    salesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Salesman is required"],
    },
    items: {
      type: [orderItemSchema],
      default: [],
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: "At least one item is required",
      },
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
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
orderSchema.index({ salesman: 1 });

export const Order = mongoose.model<IOrder, OrderModel>("Order", orderSchema);
