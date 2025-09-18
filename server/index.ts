import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();
app.set('trust proxy', 1); // Trust first proxy for proper IP detection in production
app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// Cleanup scheduler
let cleanupRunning = false;

const runCleanupTask = async () => {
  if (cleanupRunning) {
    log("Cleanup task already running, skipping...");
    return;
  }

  cleanupRunning = true;
  const startTime = new Date();
  
  try {
    // Delete polls older than 48 hours
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const result = await storage.deleteExpiredPolls(cutoffDate);
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    log(`Cleanup task completed in ${duration}ms: deleted ${result.pollsDeleted} polls and ${result.votesDeleted} votes older than ${cutoffDate.toISOString()}`);
  } catch (error) {
    log(`Cleanup task failed: ${error}`);
    console.error("Cleanup task error:", error);
  } finally {
    cleanupRunning = false;
  }
};

(async () => {
  const server = await registerRoutes(app);

  // Add admin cleanup endpoint for manual testing
  app.post('/api/admin/cleanup', async (req, res) => {
    try {
      await runCleanupTask();
      res.json({ message: "Cleanup task triggered successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Cleanup task failed", error: error.message });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Schedule daily cleanup task (24 hours = 24 * 60 * 60 * 1000 ms)
  const DAILY_INTERVAL = 24 * 60 * 60 * 1000;
  
  // Run cleanup once on startup (after a short delay to ensure DB is ready)
  setTimeout(async () => {
    log("Running initial cleanup task...");
    await runCleanupTask();
  }, 5000);
  
  // Schedule cleanup to run daily
  setInterval(async () => {
    log("Running scheduled cleanup task...");
    await runCleanupTask();
  }, DAILY_INTERVAL);
  
  log("Daily cleanup scheduler initialized - will run every 24 hours");
})();
