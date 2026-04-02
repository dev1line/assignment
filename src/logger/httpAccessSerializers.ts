import type { Request, Response } from "express";
import { SENSITIVE_QUERY_KEY_PATTERN } from "../config/constants";

function sanitizeQueryValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeQueryValue);
  }
  if (typeof value === "object") {
    return sanitizeQueryRecord(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeQueryRecord(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(query)) {
    if (SENSITIVE_QUERY_KEY_PATTERN.test(key)) {
      out[key] = "[Redacted]";
    } else {
      out[key] = sanitizeQueryValue(val);
    }
  }
  return out;
}

/**
 * Compact request shape for access logs (no full header dump).
 * Sensitive query keys are redacted; request bodies are not logged here.
 */
export function serializeHttpReq(req: Request): Record<string, unknown> {
  const rawUrl = req.originalUrl ?? req.url ?? "";
  const path = rawUrl.split("?")[0] || "/";
  const base: Record<string, unknown> = {
    id: req.requestId,
    method: req.method,
    path,
  };

  if (req.query && typeof req.query === "object" && Object.keys(req.query).length > 0) {
    base.query = sanitizeQueryRecord(req.query as Record<string, unknown>);
  }

  const ip = req.ip || req.socket?.remoteAddress;
  if (ip) {
    base.ip = ip;
  }

  return base;
}

/** Minimal response metadata for access logs (no response header dump). */
export function serializeHttpRes(res: Response): { statusCode: number | null } {
  return {
    statusCode: res.headersSent ? res.statusCode : null,
  };
}

/** Skip high-volume static Swagger UI traffic at the default access-log level. */
export function shouldIgnoreAccessLogPath(req: Request): boolean {
  const pathOnly = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
  return pathOnly.startsWith("/api-docs");
}
