import type {
  JDAnalysisOutput,
  ResumeAnalysisOutput,
  MatchAnalysisOutput,
  OptimizedResumeOutput,
  IntegrityResult,
  ScoreBreakdown,
} from '@repo/shared';

const WEIGHTS = {
  requiredSkills: 30,
  preferredSkills: 15,
  roleAlignment: 10,
  experienceAlignment: 15,
  domainAlignment: 10,
  keywordCoverage: 10,
  atsReadability: 10,
};

export function calculateScore(
  jd: JDAnalysisOutput,
  resume: ResumeAnalysisOutput,
  match: MatchAnalysisOutput,
): ScoreBreakdown {
  const requiredTotal = jd.requiredSkills.length || 1;
  const requiredScore =
    (match.matchedSkills.filter((m: { skill: string }) =>
      jd.requiredSkills.some((s: string) => s.toLowerCase() === m.skill.toLowerCase()),
    ).length /
      requiredTotal) *
    100;

  const preferredTotal = jd.preferredSkills.length || 1;
  const preferredScore =
    (match.matchedSkills.filter((m: { skill: string }) =>
      jd.preferredSkills.some((s: string) => s.toLowerCase() === m.skill.toLowerCase()),
    ).length /
      preferredTotal) *
    100;

  const roleScore = match.roleAlignment * 100;
  const experienceScore = match.experienceAlignment * 100;

  const domainScore =
    ((match.matchedSkills.length + match.partialSkills.length * 0.5) /
      (jd.requiredSkills.length + jd.preferredSkills.length || 1)) *
    100;

  const keywordScore = match.keywordCoverage * 100;
  const atsScore = 90;

  const breakdown = {
    requiredSkills: clamp(requiredScore),
    preferredSkills: clamp(preferredScore),
    roleAlignment: clamp(roleScore),
    experienceAlignment: clamp(experienceScore),
    domainAlignment: clamp(domainScore),
    keywordCoverage: clamp(keywordScore),
    atsReadability: clamp(atsScore),
  };

  const total = Math.round(
    (breakdown.requiredSkills * WEIGHTS.requiredSkills +
      breakdown.preferredSkills * WEIGHTS.preferredSkills +
      breakdown.roleAlignment * WEIGHTS.roleAlignment +
      breakdown.experienceAlignment * WEIGHTS.experienceAlignment +
      breakdown.domainAlignment * WEIGHTS.domainAlignment +
      breakdown.keywordCoverage * WEIGHTS.keywordCoverage +
      breakdown.atsReadability * WEIGHTS.atsReadability) /
      100,
  );

  return { ...breakdown, total: clamp(total) };
}

export function recalculateScore(
  jd: JDAnalysisOutput,
  optimized: OptimizedResumeOutput,
  match: MatchAnalysisOutput,
  integrity: IntegrityResult,
): ScoreBreakdown {
  const optimizedSkills = optimized.skills.map((s: string) => s.toLowerCase());

  const requiredScore =
    (jd.requiredSkills.filter((s: string) => optimizedSkills.includes(s.toLowerCase())).length /
      (jd.requiredSkills.length || 1)) *
    100;

  const preferredScore =
    (jd.preferredSkills.filter((s: string) => optimizedSkills.includes(s.toLowerCase())).length /
      (jd.preferredSkills.length || 1)) *
    100;

  const roleScore = match.roleAlignment * 100;
  const experienceScore = match.experienceAlignment * 100;
  const domainScore =
    ((match.matchedSkills.length + match.partialSkills.length * 0.5) /
      (jd.requiredSkills.length + jd.preferredSkills.length || 1)) *
    100;
  const keywordScore = match.keywordCoverage * 100;

  const breakdown = {
    requiredSkills: clamp(requiredScore),
    preferredSkills: clamp(preferredScore),
    roleAlignment: clamp(roleScore),
    experienceAlignment: clamp(experienceScore),
    domainAlignment: clamp(domainScore),
    keywordCoverage: clamp(keywordScore),
    atsReadability: clamp(integrity.score),
  };

  const total = Math.round(
    (breakdown.requiredSkills * WEIGHTS.requiredSkills +
      breakdown.preferredSkills * WEIGHTS.preferredSkills +
      breakdown.roleAlignment * WEIGHTS.roleAlignment +
      breakdown.experienceAlignment * WEIGHTS.experienceAlignment +
      breakdown.domainAlignment * WEIGHTS.domainAlignment +
      breakdown.keywordCoverage * WEIGHTS.keywordCoverage +
      breakdown.atsReadability * WEIGHTS.atsReadability) /
      100,
  );

  return { ...breakdown, total: clamp(total) };
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}
