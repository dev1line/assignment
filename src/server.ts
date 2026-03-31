import dotenv from "dotenv";
import app from "./app";
import { sequelize } from "./container";

dotenv.config();

const PORT = Number(process.env.PORT || 3000);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");
    await sequelize.sync();
    console.log("Database synced.");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
}

void start();
