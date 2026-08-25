const json = async (res) => {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error?.message || body.error || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }
  return res.json();
};

export async function chat(messages, config) {
  const { baseUrl, apiKey, model } = config || {};
  if (!baseUrl) throw new Error('Missing base URL. Open Settings and set it.');
  if (!apiKey) throw new Error('Missing API key. Open Settings and set it.');
  if (!model) throw new Error('Missing model. Open Settings and set it.');

  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  let data;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
    });
    data = await json(res);
  } catch (err) {
    if (err.message && err.message.startsWith('LLM request failed')) throw err;
    throw new Error(`Cannot reach LLM at ${url}: ${err.message}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM returned no content.');
  return content;
}

export function parseJson(content) {
  let text = String(content).trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new Error('LLM returned invalid JSON.');
  }
}
