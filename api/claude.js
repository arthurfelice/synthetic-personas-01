export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, images } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  // Build the content array — text only, or text + images (multimodal)
  let content;
  if (images && Array.isArray(images) && images.length > 0) {
    content = [
      // Images first (Anthropic recommends images before text)
      ...images.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType || 'image/jpeg',
          data: img.base64,
        },
      })),
      { type: 'text', text: prompt },
    ];
  } else {
    content = prompt; // plain string — same behaviour as before
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({ error: `Anthropic API error: ${response.status} — ${errorText}` });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
