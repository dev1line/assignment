import type { Sequelize } from "sequelize";

/**
 * Clears application rows without dropping tables (safe for shared DB vs sync force).
 * Disables FK checks briefly so truncate order is not an issue.
 */
export async function truncateAppTables(sequelize: Sequelize): Promise<void> {
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    await sequelize.query("TRUNCATE TABLE teacher_students");
    await sequelize.query("TRUNCATE TABLE students");
    await sequelize.query("TRUNCATE TABLE teachers");
  } finally {
    await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}
