import { z } from "zod";

export const LocatorCandidateSchema = z.object({
  strategy: z.string().min(1),
  locator: z.string().min(1),
  score: z.number().int().min(0).max(100),
  reason: z.string().optional(),
});

export const PageObjectSchema = z.object({
  field: z.string().min(1),
  code: z.string().min(1),
});

export const PageObjectClassSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(1),
  code: z.string().min(1),
});

export const LocatorValidationSchema = z.object({
  status: z.enum(["valid", "ambiguous", "not-found", "fragile"]),
  matchedCount: z.number().int().nonnegative(),
  checks: z.array(z.object({ label: z.string(), ok: z.boolean() })),
});

export const ElementAnalysisSchema = z.object({
  element: z.string().min(1),
  tag: z.string().min(1),
  primary: LocatorCandidateSchema,
  fallbacks: z.array(LocatorCandidateSchema).default([]),
  risks: z.array(z.string()).default([]),
  pageObject: PageObjectSchema,
  elementId: z.string().optional(),
  validation: LocatorValidationSchema.optional(),
  finalScore: z.number().int().min(0).max(100).optional(),
});

export const AnalysisSchema = z.object({
  summary: z.object({
    elementsAnalyzed: z.number().int().nonnegative(),
    highConfidence: z.number().int().nonnegative(),
    avgScore: z.number().min(0).max(100),
    warnings: z.array(z.string()).default([]),
  }),
  elements: z.array(ElementAnalysisSchema),
  pageObjectClass: PageObjectClassSchema.optional(),
});

export type LocatorAnalysis = z.infer<typeof AnalysisSchema>;
export type ElementAnalysis = z.infer<typeof ElementAnalysisSchema>;
export type LocatorCandidate = z.infer<typeof LocatorCandidateSchema>;
