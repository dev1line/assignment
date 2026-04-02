import request from "supertest";
import app from "../../src/app";
import { sequelize } from "../../src/container";
import { truncateAppTables } from "../helpers/dbCleanup";
import { ensureTestDatabaseExists } from "../helpers/ensureTestDatabase";

/** Payload larger than REQUEST_BODY_LIMIT from .env.test (100kb) for 413 tests. */
const OVERSIZED_JSON_BODY = JSON.stringify({ pad: "x".repeat(110_000) });

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

  it("should return 400 when teacher is missing", async () => {
    const res = await request(app).post("/api/register").send({
      students: ["studentjon@gmail.com"],
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher must be a valid email address");
  });

  it("should return 400 when teacher email is invalid", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        teacher: "not-an-email",
        students: ["studentjon@gmail.com"],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher must be a valid email address");
  });

  it("should return 400 when students is missing", async () => {
    const res = await request(app).post("/api/register").send({
      teacher: "teacherken@gmail.com",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Students must be a non-empty array");
  });

  it("should return 400 when students is not an array", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: "not-an-array",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Students must be a non-empty array");
  });

  it("should return 400 when students is an empty array", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Students must be a non-empty array");
  });

  it("should return 400 when a student email is invalid", async () => {
    const res = await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentjon@gmail.com", "bad-email"],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Each student must be a valid email address");
  });
});

describe("GET /api/commonstudents", () => {
  it("should return common students for multiple teachers", async () => {
    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["commonstudent@gmail.com", "onlyteacher1@gmail.com"],
      });

    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherjoe@gmail.com",
        students: ["commonstudent@gmail.com", "onlyteacher2@gmail.com"],
      });

    const res = await request(app)
      .get("/api/commonstudents")
      .query({
        teacher: ["teacherken@gmail.com", "teacherjoe@gmail.com"],
      });

    expect(res.status).toBe(200);
    expect(res.body.students).toEqual(["commonstudent@gmail.com"]);
  });

  it("should normalize uppercase teacher query email", async () => {
    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentjon@gmail.com"],
      });

    const res = await request(app)
      .get("/api/commonstudents")
      .query({ teacher: "TeacherKen@gmail.com" });

    expect(res.status).toBe(200);
    expect(res.body.students).toEqual(["studentjon@gmail.com"]);
  });

  it("should return 400 when teacher query parameter is missing", async () => {
    const res = await request(app).get("/api/commonstudents");

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher query parameter is required");
  });

  it("should return 400 for invalid teacher email format", async () => {
    const res = await request(app)
      .get("/api/commonstudents")
      .query({ teacher: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher must be a valid email address");
  });

  it("should return 400 for empty teacher query value", async () => {
    const res = await request(app).get("/api/commonstudents").query({ teacher: "" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      "Teacher query parameter must be a non-empty email address",
    );
  });

  it("should return 400 for partially invalid teacher query array", async () => {
    const res = await request(app)
      .get("/api/commonstudents")
      .query({ teacher: ["teacherken@gmail.com", ""] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      "Teacher query parameter must be a non-empty email address",
    );
  });

  it("should return 404 for non-existent teacher", async () => {
    const res = await request(app)
      .get("/api/commonstudents")
      .query({ teacher: "nonexistent@gmail.com" });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Teacher(s) not found: nonexistent@gmail.com");
  });

  it("should return 404 when one of multiple teachers does not exist", async () => {
    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentjon@gmail.com"],
      });

    const res = await request(app)
      .get("/api/commonstudents")
      .query({
        teacher: ["teacherken@gmail.com", "ghostteacher@gmail.com"],
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Teacher(s) not found: ghostteacher@gmail.com");
  });
});

describe("POST /api/suspend", () => {
  it("should suspend an existing student", async () => {
    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentjon@gmail.com"],
      });

    const res = await request(app)
      .post("/api/suspend")
      .send({ student: "studentjon@gmail.com" });

    expect(res.status).toBe(204);
  });

  it("should return 400 when student is missing", async () => {
    const res = await request(app).post("/api/suspend").send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Student must be a valid email address");
  });

  it("should return 400 when student is not a valid email", async () => {
    const res = await request(app)
      .post("/api/suspend")
      .send({ student: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Student must be a valid email address");
  });

  it("should return 404 when student does not exist", async () => {
    const res = await request(app)
      .post("/api/suspend")
      .send({ student: "nosuchstudent@gmail.com" });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Student not found: nosuchstudent@gmail.com");
  });
});

describe("POST /api/retrievefornotifications", () => {
  it("should return recipients for a teacher and notification", async () => {
    await request(app)
      .post("/api/register")
      .send({
        teacher: "teacherken@gmail.com",
        students: ["studentagnes@gmail.com", "studentmiche@gmail.com"],
      });

    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "teacherken@gmail.com",
        notification: "Hello students! @studentagnes@gmail.com",
      });

    expect(res.status).toBe(200);
    expect(res.body.recipients).toEqual(
      expect.arrayContaining([
        "studentagnes@gmail.com",
        "studentmiche@gmail.com",
      ]),
    );
    expect(res.body.recipients).toHaveLength(2);
  });

  it("should return 400 when teacher is missing", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        notification: "Hello",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher must be a valid email address");
  });

  it("should return 400 when teacher email is invalid", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "bad",
        notification: "Hello",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Teacher must be a valid email address");
  });

  it("should return 400 when notification is missing", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "teacherken@gmail.com",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Notification must (be a string|not be empty)/);
  });

  it("should return 400 when notification is empty string", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "teacherken@gmail.com",
        notification: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Notification must not be empty");
  });

  it("should return 400 when notification is not a string", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "teacherken@gmail.com",
        notification: 123,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Notification must be a string");
  });

  it("should return 404 when teacher does not exist", async () => {
    const res = await request(app)
      .post("/api/retrievefornotifications")
      .send({
        teacher: "nosuchteacher@gmail.com",
        notification: "Hello",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Teacher not found: nosuchteacher@gmail.com");
  });
});

describe("Error responses (middleware)", () => {
  it("should return 413 when JSON body exceeds REQUEST_BODY_LIMIT", async () => {
    const res = await request(app)
      .post("/api/register")
      .set("Content-Type", "application/json")
      .send(OVERSIZED_JSON_BODY);

    expect(res.status).toBe(413);
    expect(res.body.message).toBe("Request entity too large");
  });

  it("should respond with error for malformed JSON body (body parser SyntaxError)", async () => {
    const res = await request(app)
      .post("/api/register")
      .set("Content-Type", "application/json")
      .send("{bad json");

    // express.json() forwards JSON parse errors; current errorHandler maps unknown errors to 500.
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
  });
});

describe("Security headers and CORS", () => {
  it("should set X-Content-Type-Options from Helmet", async () => {
    const res = await request(app).get("/");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("should reflect allowed Origin when CORS_ORIGIN is set in .env.test", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://localhost:5173");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });
});
