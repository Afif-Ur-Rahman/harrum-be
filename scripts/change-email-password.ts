#!/usr/bin/env ts-node
// @description Updates user Email or TempPassword interactively

import readline from "readline";

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import { User } from "../src/modules/user/model/user-model";
import { hashPassword, comparePasswords } from "../src/utils";

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string): Promise<string> => new Promise((resolve) => rl.question(q, resolve));

const isValidEmail = (email: string): boolean => {
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return EMAIL_REGEX.test(email);
};

const isValidDays = (days: string): boolean => {
  const num = Number(days);
  return Number.isInteger(num) && num > 0;
};

const connectDB = async () => {
  const DB_URI = process.env.DB_URI;
  if (!DB_URI) throw new Error("DB_URI environment variable is not set");

  await mongoose.connect(DB_URI);
  console.log("✅ MongoDB connected successfully");
};

const updateEmail = async () => {
  const OLD_EMAIL = (await ask("🔴 Enter OLD email: ")).trim();
  const NEW_EMAIL = (await ask("🟢 Enter NEW email: ")).trim();

  if (!isValidEmail(OLD_EMAIL) || !isValidEmail(NEW_EMAIL)) {
    console.log("❌ Invalid email format.");
    return;
  }

  const user = await User.findOne({ email: OLD_EMAIL });
  if (!user) {
    console.log("⚠️  User not found.");
    return;
  }

  const emailExists = await User.findOne({ email: NEW_EMAIL });
  if (emailExists) {
    console.log("❌ New email already exists in database.");
    return;
  }

  user.email = NEW_EMAIL;
  await user.save();

  console.log(`✅ Email updated: ${OLD_EMAIL} → ${NEW_EMAIL}`);
};

const updateTempPassword = async () => {
  const EMAIL = (await ask("📧 Enter user email: ")).trim();
  const CURRENT_PASSWORD = (await ask("🔐 Enter current password: ")).trim();

  if (!isValidEmail(EMAIL)) {
    console.log("❌ Invalid email format.");
    return;
  }

  if (!CURRENT_PASSWORD) {
    console.log("❌ Current password is required.");
    return;
  }

  const user = await User.findOne({ email: EMAIL });
  if (!user) {
    console.log("⚠️  User not found.");
    return;
  }

  const isPasswordValid = await comparePasswords(CURRENT_PASSWORD, user.password || "");
  if (!isPasswordValid) {
    console.log("❌ Incorrect password. Aborting.");
    return;
  }

  const TEMP_PASSWORD = (await ask("🔐 Enter temp password: ")).trim();
  const DAYS_INPUT = (await ask("⏳ Enter expiry in DAYS (e.g. 5): ")).trim();

  if (!TEMP_PASSWORD) {
    console.log("❌ Temp password is required.");
    return;
  }

  if (!isValidDays(DAYS_INPUT)) {
    console.log("❌ Expiry must be a positive number of days.");
    return;
  }

  const hashedTempPassword = await hashPassword(TEMP_PASSWORD);

  const days = Number(DAYS_INPUT);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  user.tempPassword = hashedTempPassword;
  user.tempPasswordExpiry = expiryDate.toISOString();

  await user.save();

  console.log(
    `✅ Temp password set for ${EMAIL} (expires in ${days} days → ${expiryDate.toISOString()})`,
  );
};

// Main execution
const main = async () => {
  try {
    await connectDB();

    console.log("\nWhat do you want to update?");
    console.log("1️⃣  Email");
    console.log("2️⃣  TempPassword\n");

    const choice = (await ask("Select option (1 or 2): ")).trim();

    if (choice === "1") {
      await updateEmail();
    } else if (choice === "2") {
      await updateTempPassword();
    } else {
      console.log("❌ Invalid option selected.");
    }
  } catch (error) {
    console.error("❌ Script failed:", error);
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run
if (require.main === module) {
  main();
}
