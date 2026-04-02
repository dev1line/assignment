import dotenv from "dotenv";
import { sequelize } from "../models";

dotenv.config();

async function sync() {
  try {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Refusing to run sync({ force: true }) in production.");
    }

    await sequelize.sync({ force: true });
    console.log("Database synced (force: true). All tables recreated.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync database:", error);
    process.exit(1);
  }
}

void sync();
