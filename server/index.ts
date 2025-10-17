import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cookieParser());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });
  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Serve sitemap before Vite middleware
    app.get("/sitemap.xml", async (_req, res) => {
      try {
        const result = await storage.getAllVideos({ page: 1, limit: 1000 });
        const videos = result.videos;
        const videoUrls = videos
          .map((video) => {
            const lastmod = new Date(video.dateAdded).toISOString().split("T")[0];
            return ` <url>
    <loc>https://bjjlib.com/?video=${video.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
          })
          .join("\n");
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bjjlib.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${videoUrls}
</urlset>`;
        res.header("Content-Type", "application/xml");
        res.send(sitemap);
      } catch (error) {
        console.error("Error serving sitemap:", error);
        res.status(500).send("Failed to generate sitemap");
      }
    });

    // Add debug logging for route registration
    app.use((req, res, next) => {
      if (req.path.startsWith("/auth")) {
        console.log(`[DEBUG] Request to ${req.path} received`);
      }
      next();
    });

    // Setup Vite in development, ensuring /auth routes are handled by Express
    if (app.get("env") === "development") {
      const viteMiddleware = await setupVite(app, server); // Await Vite setup
      app.use((req, res, next) => {
        if (req.path.startsWith("/auth")) {
          return next(); // Pass /auth to Express routes
        }
        viteMiddleware(req, res, next); // Apply Vite middleware for other routes
      });
    } else {
      serveStatic(app);
    }

    // Start server with port conflict handling
    const startServer = (port: number) => {
      server.listen(
        {
          port,
          host: "0.0.0.0",
          reusePort: true,
        },
        () => {
          log(`serving on port ${port}`);
          console.log(
            `Port ${port} opened on https://${process.env.REPL_SLUG}.replit.dev`
          );
        }
      );
    };

    const defaultPort = parseInt(process.env.PORT || "5000", 10);
    let port = defaultPort;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        startServer(port);
        break;
      } catch (err: any) {
        if (err.code === "EADDRINUSE" && port < defaultPort + maxAttempts) {
          port++;
          console.log(`Port ${port - 1} in use, trying ${port}...`);
          continue;
        }
        console.error("Failed to start server after trying multiple ports:", err);
        throw err;
      }
    }
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
})();