import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middlewares/error.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import dataRoutes from "./modules/data/data.routes.js";
import subscriptionsRoutes from "./modules/subscriptions/subscriptions.routes.js";
import paymentsRoutes from "./modules/payments/payments.routes.js";
import webhookRoutes from "./modules/payments/webhook.routes.js";
import contactRoutes from "./modules/contact/contact.routes.js";
import analystRoutes from "./modules/analyst/analyst.routes.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));

  // Lemon Squeezy webhooks require the raw body for HMAC signature verification.
  app.use("/api/v1/webhook", express.raw({ type: "application/json" }), webhookRoutes);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/data", dataRoutes);
  app.use("/api/v1/subscriptions", subscriptionsRoutes);
  app.use("/api/v1/payments", paymentsRoutes);
  app.use("/api/v1/contact", contactRoutes);
  app.use("/api/v1/analyst", analystRoutes);

  app.use(errorMiddleware);
  return app;
}
