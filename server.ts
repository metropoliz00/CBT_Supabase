import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check endpoint
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Global CORS and preflight handling for all /api endpoints
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "authorization, x-client-info, apikey, content-type, prefer, range, accept, accept-profile, content-profile, if-match, if-none-match, x-requested-with, *"
    );
    res.setHeader(
      "Access-Control-Expose-Headers",
      "content-range, content-length, accept-ranges, x-total-count, preference-applied, content-profile, location"
    );
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  // Supabase proxy to bypass browser/iframe CORS & fetch sandboxing restrictions
  const WORKING_SUPABASE_URL = "https://uudpcksekqbpqccisowl.supabase.co";
  const SUPABASE_TARGET = (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.includes("ymihlditapicpcqronao"))
    ? process.env.VITE_SUPABASE_URL
    : WORKING_SUPABASE_URL;

  // Hop-by-hop headers that must not be forwarded to node fetch
  const HOP_BY_HOP_HEADERS = new Set([
    "host",
    "connection",
    "upgrade",
    "keep-alive",
    "transfer-encoding",
    "te",
    "trailer",
    "proxy-authorization",
    "proxy-authenticate",
    "sec-websocket-key",
    "sec-websocket-version",
    "sec-websocket-extensions",
    "sec-websocket-protocol",
    "content-length"
  ]);

  // Use raw body buffer parser for all proxy requests
  app.use("/api/supabase", express.raw({ type: "*/*", limit: "50mb" }), async (req, res) => {
    let targetUrl = "";
    try {
      // If a client sends an upgrade header (e.g. WebSocket), reject with 426 instead of crashing fetch
      if (req.headers.upgrade) {
        res.status(426).send("Upgrade Required: WebSocket connections connect directly to Supabase realtime endpoint");
        return;
      }

      const targetPath = req.originalUrl.replace(/^\/api\/supabase/, "") || "/";
      targetUrl = `${SUPABASE_TARGET}${targetPath}`;

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (!HOP_BY_HOP_HEADERS.has(lowerKey) && typeof value === "string") {
          headers[lowerKey] = value;
        }
      }

      const init: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== "GET" && req.method !== "HEAD" && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
        init.body = new Uint8Array(req.body);
      }

      const response = await fetch(targetUrl, init);

      res.status(response.status);
      response.headers.forEach((val, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== "content-encoding" && lowerKey !== "content-length" && lowerKey !== "access-control-allow-origin") {
          res.setHeader(key, val);
        }
      });
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Expose-Headers",
        "content-range, content-length, accept-ranges, x-total-count, preference-applied, content-profile, location"
      );

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error("Supabase proxy error:", error, "cause:", error.cause, "targetUrl:", targetUrl);
      res.status(502).json({
        message: "Proxy failed to reach Supabase backend",
        error: error.message || String(error),
        cause: error.cause ? String(error.cause) : undefined,
        targetUrl,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CBT Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
