import express from "express";
import request from "supertest";
import { applyTrustProxy, parseTrustProxyHops } from "../../src/middlewares/trustProxy";

const ENV_KEY = "TRUST_PROXY_HOPS";

describe("parseTrustProxyHops", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("returns 0 when unset", () => {
    delete process.env[ENV_KEY];
    expect(parseTrustProxyHops()).toBe(0);
  });

  it("returns 0 for non-numeric", () => {
    process.env[ENV_KEY] = "nope";
    expect(parseTrustProxyHops()).toBe(0);
  });

  it("returns 0 for negative", () => {
    process.env[ENV_KEY] = "-1";
    expect(parseTrustProxyHops()).toBe(0);
  });

  it("returns parsed non-negative integer", () => {
    process.env[ENV_KEY] = "1";
    expect(parseTrustProxyHops()).toBe(1);
  });
});

describe("applyTrustProxy", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("sets trust proxy from env", () => {
    process.env[ENV_KEY] = "2";
    const app = express();
    applyTrustProxy(app);
    expect(app.get("trust proxy")).toBe(2);
  });

  it("uses X-Forwarded-For client IP when hops is 1", async () => {
    process.env[ENV_KEY] = "1";
    const app = express();
    applyTrustProxy(app);
    app.get("/ip", (req, res) => {
      res.status(200).json({ ip: req.ip });
    });
    const res = await request(app).get("/ip").set("X-Forwarded-For", "203.0.113.50");
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe("203.0.113.50");
  });

  it("does not use spoofed X-Forwarded-For when hops is 0", async () => {
    delete process.env[ENV_KEY];
    const app = express();
    applyTrustProxy(app);
    app.get("/ip", (req, res) => {
      res.status(200).json({ ip: req.ip });
    });
    const res = await request(app).get("/ip").set("X-Forwarded-For", "203.0.113.50");
    expect(res.status).toBe(200);
    expect(res.body.ip).not.toBe("203.0.113.50");
  });
});
