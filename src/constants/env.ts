import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 3010;
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
export const MODE = process.env.MODE || "development";
export const DB_URI = process.env.DB_URI || "mongodb://localhost:27017/restaurant";
export const SSL_KEY = process.env.SSL_KEY || "";
export const SSL_CRT = process.env.SSL_CRT || "";
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || "";
export const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || "";

// AWS S3 Configuration Constants
export const AWS = {
  REGION: process.env.AWS_REGION || "us-east-1",
  ACCESSKEYID: process.env.AWS_ACCESSKEYID || "",
  SECRETACCESSKEY: process.env.AWS_SECRETACCESSKEY || "",
  BUCKET_NAME: process.env.AWS_BUCKET_NAME || "",
};

// sandgrid configuration
export const SENDGRID = {
  API_KEY: process.env.SENDGRID_API_KEY || "",
  EMAIL_FROM: process.env.MAIL_FROM || "",
};

// Gmail configuration
export const GMAIL = {
  USER: process.env.GMAIL_USER || "",
  PASS: process.env.GMAIL_PASS || "",
};

// WHATSAPP API
export const WHATSAPP = {
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || "",
  WHATSAPP_BASE_URL: process.env.WHATSAPP_BASE_URL || "",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
};

// OneSignal Push Notification Service
export const ONESIGNAL = {
  API_KEY: process.env.ONESIGNAL_API_KEY || "",
  APP_ID: process.env.ONESIGNAL_APP_ID || "",
};

export const BREVO = {
  API_KEY: process.env.BREVO_API_KEY || "",
  NAME: process.env.SENDER_NAME || "",
  EMAIL: process.env.SENDER_EMAIL || "",
};

// Redis Configuration (optional — enables distributed rate limiting and socket scaling)
export const REDIS_URL = process.env.REDIS_URL || "";

// Anthropic AI Configuration
// ENCRYPTION_SECRET must be at least 32 chars — used to AES-256-GCM encrypt restaurant API keys
export const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "";

// Admin Users Configuration
export const ADMIN_USERS = {
  SUPERADMIN: {
    EMAIL: process.env.SUPERADMIN_EMAIL || "",
    PASSWORD: process.env.SUPERADMIN_PASSWORD || "",
    USERNAME: "superadmin",
    FULL_NAME: "Super Admin",
    TYPE: "superAdmin",
  },
  ADMIN: {
    EMAIL: process.env.ADMIN_EMAIL || "",
    PASSWORD: process.env.ADMIN_PASSWORD || "",
    USERNAME: "admin",
    FULL_NAME: "Admin User",
    TYPE: "admin",
  },
  SUPPORT: {
    EMAIL: process.env.SUPPORT_EMAIL || "",
    PASSWORD: process.env.SUPPORT_PASSWORD || "",
    USERNAME: "support",
    FULL_NAME: "Support User",
    TYPE: "support",
  },
};
