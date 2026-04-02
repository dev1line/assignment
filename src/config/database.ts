import { Sequelize } from "sequelize";
import {
  DEFAULT_DB_HOST,
  DEFAULT_DB_NAME,
  DEFAULT_DB_PORT,
  DEFAULT_DB_USER,
} from "./constants";
import { logger } from "../logger";

/** Sequelize defaults to `console.log` when `logging` is omitted — noisy and duplicates UUIDs. */
const enableSqlLog = process.env.DB_SQL_LOG === "true";

const sequelize = new Sequelize(
  process.env.DB_NAME || DEFAULT_DB_NAME,
  process.env.DB_USER || DEFAULT_DB_USER,
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || DEFAULT_DB_HOST,
    port: Number(process.env.DB_PORT || String(DEFAULT_DB_PORT)),
    dialect: "mysql",
    logging:
      enableSqlLog
        ? (sql: string, timingMs?: number) => {
            logger.debug({ sql, ms: timingMs }, "sequelize");
          }
        : false,
  },
);

export default sequelize;
