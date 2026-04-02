import express, { type NextFunction, type Request, type Response } from "express";
import { err as errSerializer } from "pino-std-serializers";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { teacherService } from "./container";
import { openApiSpecForRequest } from "./docs/openApiForRequest";
import {
  serializeHttpReq,
  serializeHttpRes,
  shouldIgnoreAccessLogPath,
} from "./logger/httpAccessSerializers";
import { logger } from "./logger";
import { applyHttpSecurity, applyTrustProxy, errorHandler, requestId } from "./middlewares";
import createApiRouter from "./routes/api";

const app = express();

// Requirements specify success as HTTP 200 with a JSON body. Disabling Express weak ETags avoids
// conditional GET → 304 + empty body when clients send If-None-Match (e.g. Swagger / browsers).
app.set("etag", false);

applyTrustProxy(app);
app.use(requestId);
app.use(
  pinoHttp<Request, Response>({
    logger,
    genReqId: (req) => req.requestId,
    autoLogging:
      process.env.NODE_ENV === "test"
        ? false
        : {
            ignore: shouldIgnoreAccessLogPath,
          },
    customAttributeKeys: { responseTime: "responseTimeMs" },
    wrapSerializers: false,
    serializers: {
      req: serializeHttpReq,
      res: serializeHttpRes,
      err: errSerializer,
    },
    customSuccessMessage: (req, res, responseTime) => {
      const pathOnly = (req.originalUrl ?? req.url ?? "").split("?")[0] || "/";
      return `${req.method} ${pathOnly} ${res.statusCode} - ${responseTime}ms`;
    },
    customErrorMessage: (req, _res, err) => {
      const pathOnly = (req.originalUrl ?? req.url ?? "").split("?")[0] || "/";
      return `${req.method} ${pathOnly} failed: ${err.message}`;
    },
  }),
);
// Helmet, CORS, body limit, and /api rate limit run before Swagger so docs get the same baseline
// headers (except CSP: disabled globally in httpSecurity; relaxed CSP is applied below for `/api-docs` only).
applyHttpSecurity(app);
app.use(
  "/api-docs",
  (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
    );
    next();
  },
  swaggerUi.serve,
  // Load spec from URL so "Try it out" uses the real host (ALB), not localhost from static spec.
  swaggerUi.setup(undefined, { swaggerUrl: "/api-docs.json" }),
);
app.get("/", (_req, res) => {
  res.status(200).json({ message: "Teacher-Student API is running" });
});
app.get("/api-docs.json", (req, res) => {
  res.status(200).json(openApiSpecForRequest(req));
});
app.use("/api", createApiRouter(teacherService));
app.use(errorHandler);

export default app;
