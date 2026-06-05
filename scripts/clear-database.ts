// @description Clears all collections in the database except for the 'users' collection, preserving the SuperAdmin user.

import readline from "readline";

import bcrypt from "bcrypt";
import dotenv from "dotenv";
import mongoose from "mongoose";

import { User } from "../src/modules/user/model/user-model";

dotenv.config();

const DB_URI = process.env.DB_URI || "";

const clearDatabase = async (enteredPassword: string) => {
  try {
    await mongoose.connect(DB_URI);
    console.log("✅ Connected to DB");

    const superAdmin = await User.findOne({ type: "superAdmin" });
    if (!superAdmin) {
      console.log("SuperAdmin not found!");
      process.exit(1);
    }

    if (typeof superAdmin.password !== "string") {
      console.log("SuperAdmin password is invalid or missing!");
      process.exit(1);
    }
    const isPasswordValid = await bcrypt.compare(enteredPassword, superAdmin.password);

    if (!isPasswordValid) {
      console.log("Invalid SuperAdmin password!");
      process.exit(1);
    }

    await User.deleteMany({
      _id: { $nin: [superAdmin._id] },
      type: { $nin: ["admin", "superAdmin"] },
    });

    if (!mongoose.connection.db) {
      throw new Error("Database connection is not established.");
    }
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      if (collection.collectionName !== "users") {
        await collection.deleteMany({});
        console.log(`Cleared: ${collection.collectionName}`);
      }
    }

    console.log("Database cleared successfully (SuperAdmin preserved)");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing DB:", error);
    process.exit(1);
  }
};

const enteredPassword = process.argv[2];

if (!enteredPassword) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter SuperAdmin password: ", async (pwd) => {
    rl.close();
    if (!pwd) {
      console.log("Password is required!");
      process.exit(1);
    }
    await clearDatabase(pwd);
  });
} else {
  clearDatabase(enteredPassword);
}
