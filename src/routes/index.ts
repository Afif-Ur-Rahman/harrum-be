import express from "express";

import { authRoutes } from "./authRoutes";
import { prayRoutes } from "./prayRoutes";
import { userRoutes } from "./userRoutes";
import { dashboardRoutes } from "./dashboardRoutes";

const routes = express.Router();

routes.get("/", (req, res) => {
  res.json({ message: "Welcome to the Teilim API" });
});

routes.use("/api/auth", authRoutes);
routes.use("/api/dashboard", dashboardRoutes);
routes.use("/api/users", userRoutes);
routes.use("/api/prays", prayRoutes);

export { routes };
