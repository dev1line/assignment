import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

function assertSafeTestEnvironment(): void {
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const dbName = (process.env.DB_NAME || "").toLowerCase();
  const dbHost = (process.env.DB_HOST || "").toLowerCase();

  if (nodeEnv !== "test") {
    throw new Error(
      `[TEST_GUARD] NODE_ENV must be "test", got "${process.env.NODE_ENV || "undefined"}".`,
    );
  }

  if (!dbName.includes("test")) {
    throw new Error(
      `[TEST_GUARD] DB_NAME must contain "test", got "${process.env.DB_NAME || "undefined"}".`,
    );
  }

  const blockedHostHints = ["prod", "production", "rds.amazonaws.com"];
  if (blockedHostHints.some((hint) => dbHost.includes(hint))) {
    throw new Error(
      `[TEST_GUARD] DB_HOST looks like production host: "${process.env.DB_HOST || "undefined"}".`,
    );
  }
}

assertSafeTestEnvironment();
