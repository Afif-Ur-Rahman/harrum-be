// @description Sets default language to 'en' for users with invalid or missing language settings

import { Request, Response } from "express";

import { User } from "../src/modules/user/model";
import { catchAsync } from "../src/utils";

export const FixLanguage = catchAsync(async (req: Request, res: Response) => {
  try {
    await fixUserLanguage();
    return res.status(200).json({ message: "Cleanup completed successfully!" });
  } catch (error: Error | any) {
    return res.status(500).json({ message: error.message || "Error during cleanup", error });
  }
});

// Extract the cleanup logic to a standalone function
export async function fixUserLanguage(): Promise<void> {
  const allowedLanguages = ["en", "ar", "fr", "sp"];
  const result = await User.updateMany(
    {
      $or: [
        { language: { $exists: false } },
        { language: { $nin: allowedLanguages } },
        { language: null },
      ],
    },
    { $set: { language: "en" } },
  );
  console.log("✅ Language Updated to 'en' for all users with invalid or missing language");
  console.log("Summary:");
  console.log("Users updated: ", result.modifiedCount);
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
        await fixUserLanguage();
      } catch (err) {
        console.error("❌ Error during language fix:", err);
        process.exit(1);
      } finally {
        await mongoose.disconnect();
        process.exit(0);
      }
    });
  });
}
