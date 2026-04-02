import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";
import { logger } from "../logger";

type SequelizeLikeError = {
  name?: string;
  errors?: Array<{ message: string }>;
};

export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  const entityErr = err as { status?: number; statusCode?: number; type?: string };
  if (
    entityErr.status === 413 ||
    entityErr.statusCode === 413 ||
    entityErr.type === "entity.too.large"
  ) {
    return res.status(413).json({ message: "Request entity too large" });
  }

  const dbErr = err as SequelizeLikeError;
  if (
    dbErr?.name === "SequelizeValidationError" ||
    dbErr?.name === "SequelizeUniqueConstraintError"
  ) {
    const messages = (dbErr.errors || []).map((e) => e.message).join(", ");
    return res.status(400).json({ message: messages || "Validation error" });
  }

  logger.error({ err, requestId: req.requestId }, "unhandled error");
  return res.status(500).json({ message: "Internal server error" });
}
