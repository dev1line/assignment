import mysql from "mysql2/promise";

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

/**
 * Ensures the test database exists before Sequelize connects.
 * This avoids relying on docker init scripts or pre-created schemas.
 */
export async function ensureTestDatabaseExists(): Promise<void> {
  const host = env("DB_HOST", "localhost");
  const port = Number(env("DB_PORT", "3306"));
  const user = env("DB_USER", "root");
  const password = env("DB_PASSWORD", "");
  const dbName = env("DB_NAME", "teacher_student_test_db");

  // Connect to the server's default `mysql` database to create the target DB.
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: "mysql",
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
  } finally {
    await conn.end();
  }
}
