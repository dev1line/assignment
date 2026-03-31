import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

type SequelizeLikeError = {
  name?: string;
  errors?: Array<{ message: string }>;
};

export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  const dbErr = err as SequelizeLikeError;
  if (
    dbErr?.name === "SequelizeValidationError" ||
    dbErr?.name === "SequelizeUniqueConstraintError"
  ) {
    const messages = (dbErr.errors || []).map((e) => e.message).join(", ");
    return res.status(400).json({ message: messages || "Validation error" });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({ message: "Internal server error" });
}
