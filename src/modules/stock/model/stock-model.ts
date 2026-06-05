import mongoose, { Document, Model } from "mongoose";

export type StockHistory = {
  _id?: mongoose.Types.ObjectId;
  price: number;
  quantity: number;
  size: string;
  brand?: string;
  color?: string;
  date?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdByName?: string;
  type?: "stock-in" | "wastage" | "order";
  reason?: string;
};

export interface IStock extends Document {
  name: string;
  brand?: string;
  price: number;
  color?: string;
  quantity: number;
  size: string;
  stockHistory: StockHistory[];
  owner: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

type StockModel = Model<IStock>;

const stockSchema = new mongoose.Schema<IStock, StockModel>(
  {
    name: {
      type: String,
      required: [true, "Stock name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
    },
    size: {
      type: String,
      required: [true, "Size is required"],
    },
    stockHistory: [
      {
        price: {
          type: Number,
          required: [true, "Price is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
        },
        size: {
          type: String,
          required: [true, "Size is required"],
        },
        brand: {
          type: String,
        },
        color: {
          type: String,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: [true, "Created by is required"],
        },
        createdByName: { type: String },
        type: {
          type: String,
          enum: ["stock-in", "wastage", "order"],
          default: "stock-in",
        },
        reason: { type: String },
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner is required"],
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

stockSchema.index({ owner: 1 });
stockSchema.index({ owner: 1, name: 1 });

export const Stock = mongoose.model<IStock, StockModel>("Stock", stockSchema);
