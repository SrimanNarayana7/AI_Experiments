import express from 'express';
import multer from 'multer';
import { chat, parseJson } from './llm.js';
import { analyzePrompts, generatePrompts } from './prompts.js';
import { render, auditPlaceholders } from './render_resume.js';
import { renderPdf } from './render_pdf.js';
import { extractText } from './extract.js';

const PORT = process.env.PORT || 8787;
const app = express();
app.use(express.json({ limit: '5mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/extract', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required.' });
    const text = await extractText(req.file.originalname, req.file.buffer);
    res.json({ text, filename: req.file.originalname });
  } catch (err) {
    next(err);
  }
});

app.post('/api/analyze', async (req, res, next) => {
  try {
    const { resume, jd, config } = req.body || {};
    if (!resume || !jd) return res.status(400).json({ error: 'resume and jd are required.' });
    const content = await chat(analyzePrompts(resume, jd), config);
    const analysis = parseJson(content);
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

app.post('/api/generate', async (req, res, next) => {
  try {
    const { resume, jd, analysis, config } = req.body || {};
    if (!resume || !jd) return res.status(400).json({ error: 'resume and jd are required.' });
    const content = await chat(generatePrompts(resume, jd, analysis), config);
    const spec = parseJson(content);
    res.json({ spec });
  } catch (err) {
    next(err);
  }
});

app.post('/api/render', async (req, res, next) => {
  try {
    const { spec, clean, format } = req.body || {};
    if (!spec) return res.status(400).json({ error: 'spec is required.' });
    const wantPdf = format === 'pdf';

    if (clean) {
      const placeholders = auditPlaceholders(spec);
      if (placeholders.length) {
        return res.status(422).json({
          error: `refusing to build a clean copy: ${placeholders.length} placeholder(s) still unfilled.`,
          placeholders,
        });
      }
    }

    const name = (spec.name || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const suffix = clean ? '_CLEAN' : '';
    const buffer = wantPdf ? await renderPdf(spec, { clean: Boolean(clean) }) : await render(spec, Boolean(clean));
    const filename = `${name}${suffix}.${wantPdf ? 'pdf' : 'docx'}`;
    res.setHeader(
      'Content-Type',
      wantPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  const message = err && err.message ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`Resume Tailor API listening on http://localhost:${PORT}`);
});
