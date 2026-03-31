import { body, query } from "express-validator";

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
  query("teacher").exists().withMessage("Teacher query parameter is required"),
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
