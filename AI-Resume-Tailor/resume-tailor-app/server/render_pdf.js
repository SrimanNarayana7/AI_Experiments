import PDFDocument from 'pdfkit';

const THEME = {
  ink: '#1A1A1A',
  slate: '#3D4451',
  accent: '#2B5F8C',
  fill: '#B02A1F',
  muted: '#6B7280',
  rule: '#9AA0A6',
  font: 'Helvetica',
  highlight: '#FEF08A',
};

const PAGE_W = 595.28;
const MARGIN = 36; // ~0.5in
const CONTENT_W = PAGE_W - MARGIN * 2;

function parseTokens(text, { highlight = true } = {}) {
  const re = /(==[^=]+==|\[[^\]]+\]|\*\*[^*]+\*\*)/g;
  const tokens = [];
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('==')) tokens.push({ t: tok.slice(2, -2), hl: highlight });
    else if (tok.startsWith('[')) tokens.push({ t: tok, ph: true });
    else tokens.push({ t: tok.slice(2, -2), bold: true });
    last = m.index + tok.length;
  }
  if (last < text.length) tokens.push({ t: text.slice(last) });
  return tokens;
}

function writeLine(doc, tokens, opts = {}) {
  const { x = MARGIN, size = 10, color = THEME.slate, bold = false, italic = false, bullet = false } = opts;
  doc.font(THEME.font).fontSize(size).fillColor(color);
  let cx = x;
  if (bullet) {
    doc.text('•  ', x, doc.y, { continued: true, characterSpacing: 0 });
    cx = x + 10;
  }
  for (const tk of tokens) {
    const isBold = bold || tk.bold || tk.ph;
    const c = tk.ph ? THEME.fill : tk.hl ? THEME.ink : color;
    doc.font(THEME.font).fontSize(size).fillColor(c);
    if (tk.hl) {
      doc.save().rect(cx, doc.y - 2, doc.widthOfString(tk.t) + 2, doc.currentLineHeight() + 4).fill(THEME.highlight).restore();
    }
    doc.text(tk.t, cx, doc.y, {
      continued: true,
      ...(isBold ? { underline: false } : {}),
      characterSpacing: 0,
    });
    if (isBold) {
      const width = doc.widthOfString(tk.t);
      doc.font('Helvetica-Bold').fontSize(size).fillColor(c);
      doc.text(tk.t, cx, doc.y - doc.currentLineHeight(), { lineBreak: false });
      doc.font(THEME.font).fontSize(size).fillColor(color);
      cx += width;
      doc.text('', cx, doc.y);
    } else {
      cx += doc.widthOfString(tk.t);
    }
  }
  if (!tokens.length) doc.text('', x, doc.y);
}

function heading(doc, text, highlight) {
  doc.moveDown(1.2);
  const tokens = parseTokens(text, { highlight });
  writeLine(doc, tokens, { size: 11, color: THEME.accent, bold: true });
  const y = doc.y;
  doc.moveTo(MARGIN, y + 3).lineTo(PAGE_W - MARGIN, y + 3).lineWidth(1).strokeColor(THEME.accent).stroke();
  doc.y = y + 8;
  doc.moveDown(0.4);
}

function body(doc, text, highlight, opts = {}) {
  const tokens = parseTokens(text, { highlight });
  writeLine(doc, tokens, { ...opts });
  doc.moveDown(0.3);
}

function bullet(doc, text, highlight) {
  const tokens = parseTokens(text, { highlight });
  writeLine(doc, tokens, { bullet: true });
  doc.moveDown(0.15);
}

function renderSpec(doc, spec, { highlight = true } = {}) {
  doc.font(THEME.font);
  if (spec.name) {
    doc.fontSize(24).fillColor(THEME.ink);
    doc.text(spec.name.toUpperCase(), MARGIN, doc.y, { characterSpacing: 2 });
    doc.moveDown(0.2);
  }
  if (spec.title) {
    body(doc, spec.title, highlight, { size: 12, color: THEME.accent });
  }
  (spec.contact || []).forEach((items) => {
    const label = items.map((raw) => String(raw).split('|')[0]).join('  •  ');
    doc.fontSize(9).fillColor(THEME.slate);
    doc.text(label, MARGIN, doc.y);
  });
  doc.moveDown(0.3);

  for (const s of spec.sections || []) {
    if (s.heading) heading(doc, s.heading, highlight);
    if (s.body) body(doc, s.body, highlight);
    for (const [l, v] of s.rows || []) {
      const tokens = [{ t: l + '  ', bold: true }, ...parseTokens(v, { highlight })];
      writeLine(doc, tokens);
      doc.moveDown(0.15);
    }
    for (const r of s.roles || []) {
      doc.moveDown(0.3);
      const titleTokens = parseTokens(r.title, { highlight });
      writeLine(doc, titleTokens, { size: 11, color: THEME.ink, bold: true });
      if (r.org) {
        const orgTokens = [{ t: '  |  ', }, ...parseTokens(r.org, { highlight: false })];
        writeLine(doc, orgTokens, { size: 11, color: THEME.accent });
      }
      if (r.meta) body(doc, r.meta, highlight, { size: 9, color: THEME.muted, italic: true });
      for (const b of r.bullets || []) bullet(doc, b, highlight);
    }
    for (const b of s.bullets || []) bullet(doc, b, highlight);
    if (s.note && highlight) body(doc, s.note, false, { size: 9, color: THEME.fill, italic: true });
  }
}

export async function renderPdf(spec, { clean = false } = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  renderSpec(doc, spec, { highlight: !clean });
  doc.end();
  return done;
}
