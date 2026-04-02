import type { Express } from "express";

/**
 * Number of reverse proxies in front of the app (e.g. AWS ALB = 1).
 * When 0, X-Forwarded-* headers are not trusted (safe for local dev).
 */
export function parseTrustProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS?.trim();
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function applyTrustProxy(app: Express): void {
  app.set("trust proxy", parseTrustProxyHops());
}
