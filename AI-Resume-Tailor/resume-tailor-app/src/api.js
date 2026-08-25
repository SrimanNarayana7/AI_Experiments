const json = async (res) => {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
      if (body.placeholders) message += `\n${body.placeholders.join('\n')}`;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return res.json();
};

export const analyze = (resume, jd, config) =>
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd, config }),
  }).then(json);

export const generate = (resume, jd, analysis, config) =>
  fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume, jd, analysis, config }),
  }).then(json);

export const extractFile = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/extract', { method: 'POST', body: form });
  return json(res);
};

export const renderDoc = async (spec, clean, format = 'docx') => {
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spec, clean, format }),
  });
  if (!res.ok) {
    let message = res.statusText;
    let placeholders = [];
    try {
      const body = await res.json();
      message = body.error || body.message || message;
      placeholders = body.placeholders || [];
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message);
    err.placeholders = placeholders;
    throw err;
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const ext = format === 'pdf' ? 'pdf' : 'docx';
  const filename = match ? match[1] : clean ? `resume_CLEAN.${ext}` : `resume.${ext}`;
  return { blob, filename };
};
