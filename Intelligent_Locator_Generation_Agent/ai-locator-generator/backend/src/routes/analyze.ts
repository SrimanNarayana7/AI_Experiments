import { Router, type NextFunction, type Request, type Response } from "express";
import { AnalysisError, runAnalysis, validateRequest } from "../services/analyzeService.js";
import { UrlFetchError } from "../url/urlFetch.js";

export const analyzeRouter = Router();

analyzeRouter.post("/analyze", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = validateRequest(req.body);
    const { analysis } = await runAnalysis(request);
    res.json({ success: true, analysis });
  } catch (error) {
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
});
