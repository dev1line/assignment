import request from "supertest";
import app from "../../src/app";

describe("GET /", () => {
  it("should return running status", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Teacher-Student API is running" });
  });

  it("should return X-Request-Id header (UUID when not sent)", async () => {
    const res = await request(app).get("/");

    const id = res.headers["x-request-id"];
    expect(id).toBeDefined();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should echo valid client X-Request-Id", async () => {
    const customId = "client-trace-abc-01";
    const res = await request(app).get("/").set("X-Request-Id", customId);

    expect(res.headers["x-request-id"]).toBe(customId);
  });

  it("should replace invalid X-Request-Id with a new UUID", async () => {
    const res = await request(app).get("/").set("X-Request-Id", "bad@chars");

    const id = res.headers["x-request-id"];
    expect(id).not.toBe("bad@chars");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("should replace overly long X-Request-Id with a new UUID", async () => {
    const longId = `a${"b".repeat(130)}`;
    const res = await request(app).get("/").set("X-Request-Id", longId);

    const id = res.headers["x-request-id"];
    expect(id).not.toBe(longId);
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
