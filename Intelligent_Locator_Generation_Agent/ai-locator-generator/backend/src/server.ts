import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { analyzeRouter } from "./routes/analyze.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", provider: config.llmProvider });
});

app.use("/api", analyzeRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  console.error("[server]", error);
  res.status(500).json({ success: false, error: message });
});

app.listen(config.port, () => {
  console.log(`AI Locator Generator backend listening on http://localhost:${config.port} (LLM provider: ${config.llmProvider})`);
});
