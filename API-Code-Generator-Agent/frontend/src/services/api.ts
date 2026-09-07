const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export async function parseSpec(input: {
  url?: string;
  baseUrl?: string;
  file?: File;
}): Promise<import('../types').ParseResponse> {
  const form = new FormData();
  if (input.url) form.append('url', input.url);
  if (input.baseUrl) form.append('baseUrl', input.baseUrl);
  if (input.file) form.append('file', input.file);

  const res = await fetch(`${API_BASE_URL}/api/specs/parse`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function generateTests(input: {
  url?: string;
  baseUrl?: string;
  framework: string;
  additionalInstructions?: string;
  file?: File;
}): Promise<import('../types').GenerateResponse> {
  const form = new FormData();
  if (input.url) form.append('url', input.url);
  if (input.baseUrl) form.append('baseUrl', input.baseUrl);
  if (input.framework) form.append('framework', input.framework);
  if (input.additionalInstructions) form.append('additionalInstructions', input.additionalInstructions);
  if (input.file) form.append('file', input.file);

  const res = await fetch(`${API_BASE_URL}/api/specs/generate`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function fetchStats(): Promise<import('../types').StatsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/stats`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}
