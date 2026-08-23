import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';
import type { JDAnalysisOutput, ResumeAnalysisOutput, MatchAnalysisOutput } from '@repo/shared';

const jd: JDAnalysisOutput = {
  requiredSkills: ['TypeScript', 'React', 'Node.js'],
  preferredSkills: ['PostgreSQL'],
  responsibilities: ['Build web apps'],
  qualifications: ['B.S. CS'],
  keywords: ['TypeScript', 'React'],
  roleSummary: 'Full-stack engineer',
  experienceLevel: 'Senior',
};

const resume: ResumeAnalysisOutput = {
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  experiences: [
    {
      title: 'Senior Engineer',
      company: 'Acme',
      duration: '2021-Present',
      highlights: ['Built apps'],
    },
  ],
  education: [{ degree: 'B.S. CS', institution: 'University', year: '2020' }],
  certifications: [],
  summary: 'Experienced full-stack engineer',
};

const match: MatchAnalysisOutput = {
  matchedSkills: [
    { skill: 'TypeScript', evidence: 'Listed in skills' },
    { skill: 'React', evidence: 'Listed in skills' },
    { skill: 'Node.js', evidence: 'Listed in skills' },
    { skill: 'PostgreSQL', evidence: 'Listed in skills' },
  ],
  partialSkills: [],
  missingSkills: [],
  experienceGaps: [],
  keywordCoverage: 1,
  roleAlignment: 1,
  experienceAlignment: 1,
};

describe('calculateScore', () => {
  it('returns a perfect score when everything matches', () => {
    const score = calculateScore(jd, resume, match);
    expect(score.total).toBeGreaterThanOrEqual(90);
  });

  it('returns a lower score when required skills are missing', () => {
    const partialMatch: MatchAnalysisOutput = {
      ...match,
      matchedSkills: [{ skill: 'TypeScript', evidence: '' }],
      missingSkills: ['React', 'Node.js'],
    };
    const score = calculateScore(jd, resume, partialMatch);
    expect(score.total).toBeLessThan(70);
  });
});
