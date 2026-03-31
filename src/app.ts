import express from "express";
import { teacherService } from "./container";
import { errorHandler } from "./middlewares";
import createApiRouter from "./routes/api";

const app = express();

app.use(express.json());
app.get("/", (_req, res) => {
  res.status(200).json({ message: "Teacher-Student API is running" });
});
app.use("/api", createApiRouter(teacherService));
app.use(errorHandler);

export default app;
