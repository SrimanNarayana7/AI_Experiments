import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  LevelFormat,
  convertInchesToTwip,
  ExternalHyperlink,
} from 'docx';

const T = {
  ink: '1A1A1A',
  slate: '3D4451',
  accent: '2B5F8C',
  fill: 'B02A1F',
  muted: '6B7280',
  rule: '9AA0A6',
  font: 'Calibri',
  highlight: 'yellow',
};

// ---- placeholder audit -------------------------------------------------
function auditPlaceholders(spec) {
  const found = [];
  (function walk(n) {
    if (typeof n === 'string') {
      const m = n.match(/\[[^\]]+\]/g);
      if (m) found.push(...m);
    } else if (Array.isArray(n)) {
      n.forEach(walk);
    } else if (n && typeof n === 'object') {
      Object.values(n).forEach(walk);
    }
  })(spec);
  return [...new Set(found)];
}

// ---- inline markup -----------------------------------------------------
function runs(text, base, clean, theme) {
  const out = [];
  const re = /(==[^=]+==|\[[^\]]+\]|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;
  const push = (t, extra) => {
    if (t) out.push(new TextRun({ ...base, ...extra, text: t, font: theme.font }));
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('==')) {
      const inner = tok.slice(2, -2);
      const style = clean ? {} : { highlight: theme.highlight };
      out.push(...runs2(inner, { ...base, ...style }, theme));
    } else if (tok.startsWith('[')) {
      push(tok, { color: theme.fill, bold: true });
    } else {
      push(tok.slice(2, -2), { bold: true, color: theme.ink });
    }
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

function runs2(text, base, theme) {
  const out = [];
  const re = /(\[[^\]]+\]|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;
  const push = (t, extra) => {
    if (t) out.push(new TextRun({ ...base, ...extra, text: t, font: theme.font }));
  };
  while ((m = re.exec(text)) !== null) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('[')) push(tok, { color: theme.fill, bold: true });
    else push(tok.slice(2, -2), { bold: true, color: theme.ink });
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return out;
}

// ---- block builders ----------------------------------------------------
function builders(clean, theme) {
  return {
    name: (t) =>
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({ text: t, bold: true, size: 52, color: theme.ink, font: theme.font, characterSpacing: 8 }),
        ],
      }),

    title: (t) =>
      new Paragraph({
        spacing: { after: 90 },
        children: runs(t, { size: 22, color: theme.accent, characterSpacing: 12 }, clean, theme),
      }),

    contact: (items) =>
      new Paragraph({
        spacing: { after: 40 },
        children: items.flatMap((raw, i) => {
          const sep = i === 0 ? [] : [new TextRun({ text: '  •  ', size: 18, color: theme.rule, font: theme.font })];
          const [label, link] = String(raw).split('|');
          if (/[=\[*]/.test(label)) return [...sep, ...runs(label, { size: 19, color: theme.slate }, clean, theme)];
          const r = new TextRun({ text: label, size: 19, color: theme.slate, font: theme.font });
          return [...sep, link ? new ExternalHyperlink({ children: [r], link }) : r];
        }),
      }),

    heading: (t) =>
      new Paragraph({
        spacing: { before: 250, after: 125 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: theme.accent, space: 4 } },
        children: runs(t, { bold: true, size: 21, color: theme.accent, characterSpacing: 22 }, clean, theme),
      }),

    body: (t) =>
      new Paragraph({
        spacing: { after: 60, line: 250 },
        children: runs(t, { size: 20, color: theme.slate }, clean, theme),
      }),

    role: (title, org) =>
      new Paragraph({
        spacing: { before: 130, after: 10 },
        children: [
          ...runs(title, { bold: true, size: 21, color: theme.ink }, clean, theme),
          ...(org
            ? [
                new TextRun({ text: '  |  ', size: 21, color: theme.rule, font: theme.font }),
                new TextRun({ text: org, size: 21, color: theme.accent, font: theme.font }),
              ]
            : []),
        ],
      }),

    meta: (t) =>
      new Paragraph({
        spacing: { after: 70 },
        children: runs(t, { size: 18, color: theme.muted, italics: true }, clean, theme),
      }),

    bullet: (t) =>
      new Paragraph({
        numbering: { reference: 'dots', level: 0 },
        spacing: { after: 55, line: 250 },
        children: runs(t, { size: 20, color: theme.slate }, clean, theme),
      }),

    row: (l, v) =>
      new Paragraph({
        spacing: { after: 55, line: 250 },
        children: [
          ...runs(l + '  ', { bold: true, size: 20, color: theme.ink }, clean, theme),
          ...runs(v, { size: 20, color: theme.slate }, clean, theme),
        ],
      }),

    note: (t) =>
      new Paragraph({
        spacing: { before: 60, after: 60, line: 240 },
        children: runs(t, { size: 17, color: theme.fill, italics: true }, clean, theme),
      }),
  };
}

export function render(spec, clean = false) {
  const theme = Object.assign({}, T, spec.theme || {});
  const P = builders(clean, theme);

  const kids = [];
  if (spec.name) kids.push(P.name(spec.name));
  if (spec.title) kids.push(P.title(spec.title));
  (spec.contact || []).forEach((line) => kids.push(P.contact(line)));

  for (const s of spec.sections || []) {
    if (s.heading) kids.push(P.heading(s.heading));
    if (s.body) kids.push(P.body(s.body));
    for (const [l, v] of s.rows || []) kids.push(P.row(l, v));
    for (const r of s.roles || []) {
      kids.push(P.role(r.title, r.org));
      if (r.meta) kids.push(P.meta(r.meta));
      for (const b of r.bullets || []) kids.push(P.bullet(b));
    }
    for (const b of s.bullets || []) kids.push(P.bullet(b));
    if (s.note && !clean) kids.push(P.note(s.note));
  }

  const doc = new Document({
    creator: spec.name || 'Resume',
    title: spec.docTitle || spec.name || 'Resume',
    numbering: {
      config: [
        {
          reference: 'dots',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 200, hanging: 170 } }, run: { color: theme.accent, size: 20 } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(spec.margin ?? 0.5),
              bottom: convertInchesToTwip(spec.margin ?? 0.5),
              left: convertInchesToTwip(0.62),
              right: convertInchesToTwip(0.62),
            },
          },
        },
        children: kids,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export { auditPlaceholders };
