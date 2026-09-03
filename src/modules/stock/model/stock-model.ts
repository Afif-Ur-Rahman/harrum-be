import mongoose, { Document, Model } from "mongoose";

export type StockVariant = {
  _id?: mongoose.Types.ObjectId;
  color: string;
  quantity: number;
};

export type StockHistory = {
  _id?: mongoose.Types.ObjectId;
  purchasePrice: number;
  wholesalePrice: number;
  salePrice: number;
  variants: StockVariant[];
  date: Date;
};

export interface IStock extends Document {
  name: string;
  brand: string;
  purchasePrice: number;
  wholesalePrice: number;
  salePrice: number;
  variants: StockVariant[];
  size: string;
  type: string;
  history: StockHistory[];
}

type StockModel = Model<IStock>;

const variantSchema = new mongoose.Schema<StockVariant>({
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
});

const historySchema = new mongoose.Schema<StockHistory>(
  {
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },
    wholesalePrice: {
      type: Number,
      required: [true, "Whole sale price is required"],
      min: [0, "Whole sale price cannot be negative"],
    },
    salePrice: {
      type: Number,
      required: [true, "Sale price is required"],
      min: [0, "Sale price cannot be negative"],
      validate: {
        validator: function (this: StockHistory, value: number) {
          return value >= this.wholesalePrice;
        },
        message: "Sale price should be greater than or equal to wholesale price",
      },
    },
    variants: {
      type: [variantSchema],
      required: true,
      validate: {
        validator: (variants: StockVariant[]) => variants.length > 0,
        message: "At least one variant is required in history",
      },
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const stockSchema = new mongoose.Schema<IStock, StockModel>(
  {
    name: {
      type: String,
      required: [true, "Stock name is required"],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
      trim: true,
      uppercase: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },
    wholesalePrice: {
      type: Number,
      required: [true, "Whole sale price is required"],
      min: [0, "Whole sale price cannot be negative"],
    },
    salePrice: {
      type: Number,
      required: [true, "Sale price is required"],
      min: [0, "Sale price cannot be negative"],
      validate: {
        validator: function (this: IStock, value: number) {
          return value >= this.wholesalePrice;
        },
        message: "Sale price should be greater than or equal to wholesale price",
      },
    },
    size: {
      type: String,
      required: [true, "Size is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      trim: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator: (variants: StockVariant[]) => variants.length > 0,
        message: "At least one variant is required",
      },
    },
    history: {
      type: [historySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

stockSchema.index({ name: 1 });
stockSchema.index({ brand: 1 });
stockSchema.index({ name: 1, brand: 1 }, { unique: true });

export const Stock = mongoose.model<IStock, StockModel>("Stock", stockSchema);
