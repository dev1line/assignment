import { body, query } from "express-validator";
import isEmail from "validator/lib/isEmail";
import normalizeEmail from "validator/lib/normalizeEmail";

export const registerValidator = [
  body("teacher")
    .isEmail()
    .withMessage("Teacher must be a valid email address")
    .normalizeEmail(),
  body("students")
    .isArray({ min: 1 })
    .withMessage("Students must be a non-empty array"),
  body("students.*")
    .isEmail()
    .withMessage("Each student must be a valid email address")
    .normalizeEmail(),
];

export const commonStudentsValidator = [
  query("teacher")
    .exists()
    .withMessage("Teacher query parameter is required")
    .bail()
    .custom((value) => {
      const emails = Array.isArray(value) ? value : [value];
      return (
        emails.length > 0 &&
        emails.every((email) => typeof email === "string" && email.trim() !== "")
      );
    })
    .withMessage("Teacher query parameter must be a non-empty email address")
    .bail()
    .custom((value) => {
      const emails = Array.isArray(value) ? value : [value];
      return emails.every((email) => isEmail(email.trim()));
    })
    .withMessage("Teacher must be a valid email address")
    .customSanitizer((value) => {
      const normalize = (email: string): string =>
        normalizeEmail(email.trim()) || email.trim().toLowerCase();

      if (Array.isArray(value)) {
        return value.map((email) => normalize(email));
      }

      return normalize(value);
    }),
];

export const suspendValidator = [
  body("student")
    .isEmail()
    .withMessage("Student must be a valid email address")
    .normalizeEmail(),
];

export const retrieveForNotificationsValidator = [
  body("teacher")
    .isEmail()
    .withMessage("Teacher must be a valid email address")
    .normalizeEmail(),
  body("notification")
    .isString()
    .withMessage("Notification must be a string")
    .notEmpty()
    .withMessage("Notification must not be empty"),
];
