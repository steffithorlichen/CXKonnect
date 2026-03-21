// api/chat.js
// Proxies requests to the Anthropic API so the key never touches the browser.
// Deploy to Vercel alongside your existing api/ functions.
// Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — allow your domain (and localhost for testing)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing question' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured in Vercel environment variables.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are the CX Konnect AI Assistant — an expert on the CX Konnect Framework created by Stefanie Thorlichen. The framework covers: outcome-driven CX (measuring customer outcomes not just activity), the five customer journey stages (Connect & Align, Enable & Certify, Activate & Monitor, Expand & Optimize, Renew & Advocate), breaking functional silos, cross-functional collaboration, 8 key CX metrics (Time to First Value, Outcome Achievement Rate, Adoption Depth Score, etc.), culture as the deciding factor in CX transformation, AI as an intelligence layer vs. collection of tools, and scaling CX transformation incrementally. Answer questions thoughtfully and practically. Be warm, direct, and useful. Keep responses to 3–5 sentences max unless more detail is clearly needed.`,
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return res.status(response.status).json({ error: 'Anthropic API error', detail: err });
    }

    const data = await response.json();
    const answer = data.content?.find(c => c.type === 'text')?.text || 'No response generated.';
    return res.status(200).json({ answer });

  } catch (err) {
    console.error('Chat proxy error:', err);
    return res.status(500).json({ error: 'Request failed', detail: err.message });
  }
}
