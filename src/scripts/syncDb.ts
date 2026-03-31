import dotenv from "dotenv";
import { sequelize } from "../models";

dotenv.config();

async function sync() {
  try {
    await sequelize.sync({ force: true });
    console.log("Database synced (force: true). All tables recreated.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync database:", error);
    process.exit(1);
  }
}

void sync();
