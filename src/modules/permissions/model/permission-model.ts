import mongoose, { Document, Model, Schema } from "mongoose";

export const PERMISSION_PAGES = [
  "dashboard",
  "orders",
  "customers",
  "vendors",
  "stocks",
  "expenses",
  "employees",
] as const;

export interface PagePermission {
  key: (typeof PERMISSION_PAGES)[number];
  allowed: boolean;
}

export interface PermissionDocument extends Document {
  employee: mongoose.Types.ObjectId;
  pages: PagePermission[];
  createdAt: Date;
  updatedAt: Date;
}

const pagePermissionSchema = new Schema<PagePermission>(
  {
    key: {
      type: String,
      required: true,
      enum: PERMISSION_PAGES,
      trim: true,
    },
    allowed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const permissionSchema = new Schema<PermissionDocument>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      unique: true,
      index: true,
    },
    pages: {
      type: [pagePermissionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Permission: Model<PermissionDocument> =
  mongoose.models.Permission || mongoose.model<PermissionDocument>("Permission", permissionSchema);
