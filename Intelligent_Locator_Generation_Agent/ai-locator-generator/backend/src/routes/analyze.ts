import { Router, type NextFunction, type Request, type Response } from "express";
import { AnalysisError, getAnalysisState, getAnalysisZip, runAnalysis, validateRequest } from "../services/analyzeService.js";
import { UrlFetchError } from "../url/urlFetch.js";

export const analyzeRouter = Router();

analyzeRouter.post("/analyze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = validateRequest(req.body);
    const outcome = await runAnalysis(request);
    if (outcome.kind === "async") {
      res.status(202).json({
        success: true,
        analysisId: outcome.analysisId,
        status: "processing",
        processing: outcome.processing,
        domStats: outcome.domStats,
      });
      return;
    }
    res.json({
      success: true,
      status: "completed",
      analysisId: outcome.analysisId,
      analysis: outcome.analysis,
      files: outcome.files,
      project: outcome.project,
      processing: outcome.processing,
      domStats: outcome.domStats,
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

analyzeRouter.get("/analyze/:analysisId", (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = getAnalysisState(req.params.analysisId);
    res.json({
      success: true,
      analysisId: job.analysisId,
      status: job.status,
      processing: job.processing,
      domStats: job.domStats,
      analysis: job.result?.analysis,
      files: job.result?.files,
      project: job.result?.project,
      error: job.error,
    });
  } catch (error) {
    handleError(error, res, next);
  }
});

analyzeRouter.get("/analyze/:analysisId/download", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, projectName } = getAnalysisZip(req.params.analysisId);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${projectName}"`);
    res.send(buffer);
  } catch (error) {
    handleError(error, res, next);
  }
});

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof AnalysisError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  if (error instanceof UrlFetchError) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }
  next(error);
}
