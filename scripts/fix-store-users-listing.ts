// @description Fixes totalListing counts for users and stores based on their associated listings

import { Request, Response } from "express";

import { Store, Property, Vehicle, Market } from "../src/models";
import { User } from "../src/modules/user/model";
import { catchAsync } from "../src/utils";

export const ListingFix = catchAsync(async (req: Request, res: Response) => {
  try {
    await userAndStoreListingFixes();
    return res.status(200).json({ message: "Cleanup completed successfully!" });
  } catch (error: Error | any) {
    return res.status(500).json({ message: error.message || "Error during cleanup", error });
  }
});

export async function userAndStoreListingFixes(): Promise<void> {
  const users = await User.find().lean();
  const stores = await Store.find().lean();

  let usersUpdated = 0;
  let storesUpdated = 0;

  for (const user of users) {
    const userId = user._id;
    const propertyCount = await Property.countDocuments({ owner: userId });
    const vehicleCount = await Vehicle.countDocuments({ owner: userId });
    const marketCount = await Market.countDocuments({ owner: userId, type: "User" });
    const totalListing = propertyCount + vehicleCount + marketCount;

    const result = await User.updateOne({ _id: userId }, { totalListing });
    if (result.modifiedCount > 0) usersUpdated++;
  }

  for (const store of stores) {
    const storeId = store._id;
    const marketCount = await Market.countDocuments({ owner: storeId, type: "Store" });
    const totalListing = marketCount;

    const result = await Store.updateOne({ _id: storeId }, { totalListing });
    if (result.modifiedCount > 0) storesUpdated++;
  }

  console.log("✅ User and Store listings fixed");
  console.log("Summary:");
  console.log("Stores Updated:", storesUpdated);
  console.log("Users Updated:", usersUpdated);
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
        await userAndStoreListingFixes();
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
