#!/usr/bin/env ts-node
// @description Creates initial superadmin and admin users in the database with environment-based configuration

import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config();

// Import the User model and admin configuration
import { ADMIN_USERS } from "../src/constants/env";
import { User } from "../src/modules/user/model/user-model";

// Database connection
const connectDB = async () => {
  try {
    const DB_URI = process.env.DB_URI;
    if (!DB_URI) {
      throw new Error("DB_URI environment variable is not set");
    }

    await mongoose.connect(DB_URI);
    console.log(`✅ MongoDB connected successfully [${DB_URI}]`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error}`);
    process.exit(1);
  }
};

// Create admin users
const createAdminUsers = async () => {
  try {
    console.log("🚀 Starting admin user creation...");
    console.log("📋 Required environment variables:");
    console.log(`  SUPERADMIN_EMAIL: ${ADMIN_USERS.SUPERADMIN.EMAIL || "NOT SET"}`);
    console.log(
      `  SUPERADMIN_PASSWORD: ${ADMIN_USERS.SUPERADMIN.PASSWORD ? "***SET***" : "NOT SET"}`,
    );

    // Validate required environment variables
    if (!ADMIN_USERS.SUPERADMIN.EMAIL || !ADMIN_USERS.SUPERADMIN.PASSWORD) {
      throw new Error(
        "SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD environment variables are required",
      );
    }

    // Check if users already exist
    const existingSuperAdmin = await User.findOne({ email: ADMIN_USERS.SUPERADMIN.EMAIL });

    if (existingSuperAdmin) {
      console.log("⚠️  Superadmin already exists, skipping...");
    } else {
      // Create superadmin
      const superAdminPassword = await bcrypt.hash(ADMIN_USERS.SUPERADMIN.PASSWORD, 10);
      const superAdmin = new User({
        email: ADMIN_USERS.SUPERADMIN.EMAIL,
        username: ADMIN_USERS.SUPERADMIN.USERNAME,
        fullName: ADMIN_USERS.SUPERADMIN.FULL_NAME,
        password: superAdminPassword,
        type: ADMIN_USERS.SUPERADMIN.TYPE,
        phone: "",
        bio: "System Super Administrator",
        city: "",
        gender: "Other",
        // image:
        //   "https://res.cloudinary.com/dc1vhqmg2/image/upload/v1759832040/avatar-removebg-preview_xkwoli.png",
      });

      await superAdmin.save();
      console.log("✅ Superadmin created successfully");
    }

    console.log("🎉 Admin user creation completed!");

    // Display created users
    const allAdmins = await User.find({ type: { $in: ["superAdmin"] } });
    console.log("\n📋 Current admin users:");
    allAdmins.forEach((user) => {
      console.log(`  - ${user.email} (${user.type})`);
    });
  } catch (error) {
    console.error(`❌ Error creating admin users: ${error}`);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await createAdminUsers();
    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error(`❌ Migration failed: ${error}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run the migration
if (require.main === module) {
  main();
}
