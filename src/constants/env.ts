import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 3010;
export const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
export const MODE = process.env.MODE || "";
export const DB_URI = process.env.DB_URI || "";
export const SSL_KEY = process.env.SSL_KEY || "";
export const SSL_CRT = process.env.SSL_CRT || "";
export const JWT_SECRET = process.env.JWT_SECRET || "";

export const BREVO = {
  API_KEY: process.env.BREVO_API_KEY || "",
  NAME: process.env.SENDER_NAME || "",
  EMAIL: process.env.SENDER_EMAIL || "",
};

// Redis Configuration (optional — enables distributed rate limiting and socket scaling)
export const REDIS_URL = process.env.REDIS_URL || "";

// Admin Users Configuration
export const ADMIN_USERS = {
  SUPERADMIN: {
    EMAIL: process.env.SUPERADMIN_EMAIL || "",
    PASSWORD: process.env.SUPERADMIN_PASSWORD || "",
    USERNAME: "Owner",
    TYPE: "owner",
  },
};
