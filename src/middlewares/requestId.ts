import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { REQUEST_ID_INCOMING_PATTERN, REQUEST_ID_MAX_LEN } from "../config/constants";

function readIncomingId(req: Request): string {
  const raw = req.headers["x-request-id"];
  const v = typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() ?? "" : "";
  if (v.length > 0 && v.length <= REQUEST_ID_MAX_LEN && REQUEST_ID_INCOMING_PATTERN.test(v)) {
    return v;
  }
  return randomUUID();
}

export default function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = readIncomingId(req);
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
