import request from "supertest";
import app from "../../src/app";
import { sequelize } from "../../src/container";
import { truncateAppTables } from "../helpers/dbCleanup";
import { ensureTestDatabaseExists } from "../helpers/ensureTestDatabase";

beforeAll(async () => {
  await ensureTestDatabaseExists();
  await sequelize.authenticate();
  // Ensure tables exist in the test DB (safe: test DB is isolated via .env.test).
  await sequelize.sync();
  await truncateAppTables(sequelize);
});

afterEach(async () => {
  await truncateAppTables(sequelize);
});

afterAll(async () => {
  await sequelize.close();
});

describe("POST /api/register", () => {
  it("should register students to a teacher", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentjon@gmail.com", "studenthon@gmail.com"],
      });

    expect(res.status).toBe(204);
  });
});

describe("GET /api/commonstudents", () => {
  it("should return 404 for non-existent teacher", async () => {
    const res = await request(app)
      .get("/api/commonstudents")
      .query({ teacher: "nonexistent@gmail.com" });
    expect(res.status).toBe(404);
  });
});
