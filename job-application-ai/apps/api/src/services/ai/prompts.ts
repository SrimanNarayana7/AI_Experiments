export const jdAnalysisPrompt = (jobDescription: string): string =>
  `Analyze the following job description and extract structured information.
Return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra commentary.

JSON schema:
{
  "requiredSkills": ["skill 1", "skill 2", ...],
  "preferredSkills": ["skill 1", "skill 2", ...],
  "responsibilities": ["responsibility 1", ...],
  "qualifications": ["qualification 1", ...],
  "keywords": ["keyword 1", ...],
  "roleSummary": "Brief summary of the role",
  "experienceLevel": "e.g. Junior, Mid, Senior, Staff"
}

Job Description:
${jobDescription}`;

export const resumeAnalysisPrompt = (resumeText: string): string =>
  `Analyze the following resume text and extract structured information.
Return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra commentary.

JSON schema:
{
  "skills": ["skill 1", "skill 2", ...],
  "experiences": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Date range",
      "highlights": ["achievement 1", ...]
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "Institution name",
      "year": "Year"
    }
  ],
  "certifications": ["certification 1", ...],
  "summary": "Professional summary"
}

Resume:
${resumeText}`;

export const matchAnalysisPrompt = (
  jdAnalysis: string,
  resumeAnalysis: string,
): string =>
  `Compare the following job description analysis with the resume analysis.
Return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra commentary.

JSON schema:
{
  "matchedSkills": [{"skill": "skill name", "evidence": "where it appears in resume"}, ...],
  "partialSkills": [{"skill": "skill name", "evidence": "partial evidence"}, ...],
  "missingSkills": ["skill name", ...],
  "experienceGaps": ["gap description", ...],
  "keywordCoverage": 0.0,
  "roleAlignment": 0.0,
  "experienceAlignment": 0.0
}

For keywordCoverage, roleAlignment, and experienceAlignment use values between 0.0 and 1.0.

Job Description Analysis:
${jdAnalysis}

Resume Analysis:
${resumeAnalysis}`;

export const optimizeResumePrompt = (
  jobDescription: string,
  masterResumeText: string,
  matchAnalysis: string,
  iteration: number,
): string =>
  `You are an expert resume writer. Tailor the following master resume for the job description.
This is optimization iteration ${iteration}. Do NOT fabricate experience. Only emphasize existing, relevant experience.
Return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra commentary.

JSON schema:
{
  "summary": "Tailored professional summary",
  "skills": ["skill 1", "skill 2", ...],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Date range",
      "highlights": ["achievement 1", ...]
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "Institution name",
      "year": "Year"
    }
  ],
  "certifications": ["certification 1", ...],
  "changes": ["description of change 1", ...]
}

Job Description:
${jobDescription}

Master Resume:
${masterResumeText}

Match Analysis:
${matchAnalysis}`;

export const validateResumePrompt = (
  optimizedResume: string,
  masterResumeText: string,
): string =>
  `Validate the following optimized resume against the master resume.
Check for fabrication, inaccurate dates, unsupported claims, keyword stuffing, and ATS readability.
Return ONLY a valid JSON object with no markdown formatting, no code fences, and no extra commentary.

JSON schema:
{
  "passed": true,
  "issues": ["issue 1", ...],
  "score": 95
}

score must be 0-100. passed should be true if no major issues.

Optimized Resume:
${optimizedResume}

Master Resume:
${masterResumeText}`;
