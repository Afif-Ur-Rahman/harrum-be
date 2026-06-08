import mongoose from "mongoose";

export interface IProduct {
  owner: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  wholesalePrice?: number;
  purchasePrice: number;
  sellingPrice: number;
  variants: {
    _id?: mongoose.Types.ObjectId;
    color?: string;
    stock: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  size: string;
  brand: string;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: [true, "Name is required"] },
    description: { type: String },
    wholesalePrice: { type: Number },
    purchasePrice: { type: Number, required: [true, "Purchase price is required"] },
    sellingPrice: { type: Number, required: [true, "Selling price is required"] },
    brand: { type: String },
    size: { type: String },
    variants: [
      {
        color: { type: String },
        stock: { type: mongoose.Schema.Types.ObjectId, ref: "Stock" },
        quantity: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ owner: 1, name: 1 });

export const Product = mongoose.model<IProduct>("Product", productSchema);
