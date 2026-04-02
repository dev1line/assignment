import type { Express } from "express";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import {
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_REQUEST_BODY_LIMIT,
} from "../config/constants";

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function corsOptions(): cors.CorsOptions {
  const allowed = parseCorsOrigins();
  if (allowed.length > 0) {
    return { origin: allowed };
  }
  if (process.env.NODE_ENV === "production") {
    return { origin: false };
  }
  return { origin: true };
}

export function applyHttpSecurity(app: Express): void {
  // Default Helmet CSP breaks Swagger UI (inline scripts). CSP is set only on `/api-docs` in app.ts.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(corsOptions()));

  // Rate limiting is skipped in test (NODE_ENV=test) so integration tests are deterministic.
  const limiter = rateLimit({
    windowMs: Number(
      process.env.RATE_LIMIT_WINDOW_MS ?? String(DEFAULT_RATE_LIMIT_WINDOW_MS),
    ),
    max: Number(process.env.RATE_LIMIT_MAX ?? String(DEFAULT_RATE_LIMIT_MAX)),
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  });
  app.use("/api", limiter);

  const bodyLimit = process.env.REQUEST_BODY_LIMIT ?? DEFAULT_REQUEST_BODY_LIMIT;
  app.use(express.json({ limit: bodyLimit }));
}
