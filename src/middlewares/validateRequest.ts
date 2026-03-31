import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { BadRequestError } from "../errors";

export default function validateRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new BadRequestError(
      errors
        .array()
        .map((e) => e.msg)
        .join(", "),
    );
  }

  next();
}
