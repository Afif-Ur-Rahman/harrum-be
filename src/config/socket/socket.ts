import http from "http";

import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import { getRedisClient } from "@/config/redis";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

let io: Server;

export const initSocket = async (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  // Use Redis adapter when REDIS_URL is configured — enables multi-instance scaling
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.connect();
      const subClient = redis.duplicate();
      subClient.on("error", (err) => console.error("Redis sub-client error:", err));
      await subClient.connect();
      io.adapter(createAdapter(redis, subClient));
      console.log("Socket.io using Redis adapter");
    } catch {
      console.warn("Redis unavailable — Socket.io using in-memory adapter");
    }
  }

  io.on("connection", async (socket) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        socket.disconnect();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        role: string;
        email: string;
        iat: number;
        exp: number;
      };

      socket.join(`user:${decoded.id}`);
      if (decoded.role === "waiter") socket.join("waiters");
      if (decoded.role === "chef") socket.join("chefs");

      socket.on("join:table", (tableId: string) => {
        socket.join(`table:${tableId}`);
      });

      socket.on("leave:table", (tableId: string) => {
        socket.leave(`table:${tableId}`);
      });

      socket.on("disconnect", () => {
        // cleanup handled by socket.io automatically
      });
    } catch {
      socket.disconnect();
    }
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
