/**
 * Shared application constants (defaults when environment variables are unset).
 */

/** HTTP server listen port fallback. */
export const DEFAULT_PORT = 3000;

/** Max ms to wait during graceful shutdown before force exit. */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Default `[service]` field in structured logs (override with {@link serviceLogger}). */
export const DEFAULT_LOG_SERVICE = "teacher-student-api";

/** Pino numeric level → label (dev one-line pretty format). */
export const PINO_LEVEL_LABELS: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

/** Defense-in-depth: strip these paths from any log object (pino redact). */
export const LOG_REDACT_PATHS: string[] = [
  "*.password",
  "*.passwd",
  "*.secret",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "body.password",
  "body.token",
  "body.refreshToken",
];

export const LOG_REDACT_CENSOR = "[Redacted]";

/** Keys hidden from pino-pretty trailing object dump (comma-separated). */
export const PINOPRETTY_IGNORE_KEYS = "hostname,pid,req,res,responseTimeMs,service";

/** Max length for incoming `X-Request-Id` when client supplies one. */
export const REQUEST_ID_MAX_LEN = 128;

/** Allowed characters for client-supplied request id. */
export const REQUEST_ID_INCOMING_PATTERN = /^[a-zA-Z0-9-]+$/;

/** Query parameter names whose values must never appear in access logs. */
export const SENSITIVE_QUERY_KEY_PATTERN =
  /^(token|access_?token|refresh_?token|password|passwd|secret|api_?key|auth|authorization|credential|session)$/i;

/** Rate limit window when `RATE_LIMIT_WINDOW_MS` is unset (15 minutes). */
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Max requests per window when `RATE_LIMIT_MAX` is unset. */
export const DEFAULT_RATE_LIMIT_MAX = 100;

/** JSON body size when `REQUEST_BODY_LIMIT` is unset. */
export const DEFAULT_REQUEST_BODY_LIMIT = "100kb";

export const DEFAULT_DB_NAME = "teacher_student_db";
export const DEFAULT_DB_USER = "root";
export const DEFAULT_DB_HOST = "localhost";
export const DEFAULT_DB_PORT = 3306;
