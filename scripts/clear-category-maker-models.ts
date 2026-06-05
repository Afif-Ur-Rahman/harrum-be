// @description Clears all categories, manufacturers, and models from the database.

import { Request, Response } from "express";

import { Category, Manufacturer, Model } from "../src/models";
import { catchAsync } from "../src/utils";

export const ClearCategoryMakerModel = catchAsync(async (req: Request, res: Response) => {
  try {
    await clearCategoryMakerModels();
    return res.status(200).json({ message: "Cleanup completed successfully!" });
  } catch (error: Error | any) {
    return res.status(500).json({ message: error.message || "Error during cleanup", error });
  }
});

export async function clearCategoryMakerModels(): Promise<void> {
  const categoriesDeleted = await Category.deleteMany({});
  const manufacturersDeleted = await Manufacturer.deleteMany({});
  const modelsDeleted = await Model.deleteMany({});

  console.log("✅ User and Store listings fixed");
  console.log("Summary:");
  console.log(`Categories Deleted: ${categoriesDeleted.deletedCount}`);
  console.log(`Manufacturers Deleted: ${manufacturersDeleted.deletedCount}`);
  console.log(`Models Deleted: ${modelsDeleted.deletedCount}`);
}

// CLI entry point
if (require.main === module) {
  import("dotenv").then((dotenv) => {
    dotenv.config();
    import("mongoose").then(async (mongoose) => {
      const DB_URI = process.env.DB_URI;
      if (!DB_URI) {
        console.error("❌ DB_URI is not set");
        process.exit(1);
      }
      await mongoose.connect(DB_URI);
      console.log("✅ Connected to DB");
      try {
        await clearCategoryMakerModels();
      } catch (err) {
        console.error("❌ Error during user and store listing fixes:", err);
        process.exit(1);
      } finally {
        await mongoose.disconnect();
        process.exit(0);
      }
    });
  });
}
