import pino from "pino";
import type { DestinationStream } from "pino";
import {
  DEFAULT_LOG_SERVICE,
  LOG_REDACT_CENSOR,
  LOG_REDACT_PATHS,
  PINO_LEVEL_LABELS,
  PINOPRETTY_IGNORE_KEYS,
} from "./config/constants";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isTest = nodeEnv === "test";

function resolveLevel(): pino.LevelWithSilent {
  const fromEnv = process.env.LOG_LEVEL?.trim();
  if (fromEnv) return fromEnv as pino.LevelWithSilent;
  if (isTest) return "silent";
  return "info";
}

const level = resolveLevel();

const baseOptions: pino.LoggerOptions = {
  level,
  base: { service: DEFAULT_LOG_SERVICE },
  redact: {
    paths: LOG_REDACT_PATHS,
    censor: LOG_REDACT_CENSOR,
  },
};

function createLogger(): pino.Logger {
  if (nodeEnv === "development" && !isTest) {
    // pino `transport` runs in a Worker — options must be structured-cloneable (no functions).
    // pino-pretty as the second argument runs in-process; customPrettifiers / messageFormat are OK.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pinoPretty = require("pino-pretty") as typeof import("pino-pretty");
    const stream: DestinationStream = pinoPretty({
      colorize: true,
      singleLine: true,
      ignore: PINOPRETTY_IGNORE_KEYS,
      translateTime: "HH:MM:ss",
      customPrettifiers: {
        time: () => "",
        level: () => "",
      },
      messageFormat: (log: Record<string, unknown>, messageKey: string) => {
        const t = log.time;
        const timeStr =
          typeof t === "number"
            ? new Date(t).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })
            : "";
        const lvl = log.level;
        const levelStr =
          typeof lvl === "number" ? (PINO_LEVEL_LABELS[lvl] ?? String(lvl)) : "?";
        const svc = typeof log.service === "string" ? log.service : DEFAULT_LOG_SERVICE;
        const msg = log[messageKey];
        const msgStr =
          typeof msg === "string" || typeof msg === "number"
            ? String(msg)
            : msg === undefined || msg === null
              ? ""
              : JSON.stringify(msg);
        return `[${timeStr}] [${levelStr}] [${svc}] ${msgStr}`;
      },
    });
    return pino(baseOptions, stream);
  }
  return pino(baseOptions);
}

export const logger = createLogger();

/** Child logger with its own `[service]` label (e.g. per controller / domain). */
export function serviceLogger(service: string): pino.Logger {
  return logger.child({ service });
}
