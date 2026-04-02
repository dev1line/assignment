import type { Request } from "express";
import swaggerSpec from "./swagger";

/** OpenAPI spec with `servers` matching how the client reached the API (ALB, localhost, etc.). */
export function openApiSpecForRequest(req: Pick<Request, "get" | "protocol">) {
  const rawProto = req.get("x-forwarded-proto") ?? req.protocol;
  const proto = rawProto.split(",")[0]?.trim() ?? "http";
  const rawHost = req.get("x-forwarded-host") ?? req.get("host");
  const host = rawHost?.split(",")[0]?.trim();
  const servers = host
    ? [{ url: `${proto}://${host}`, description: "Current host" }]
    : [{ url: "/", description: "Same origin" }];
  return { ...swaggerSpec, servers };
}
