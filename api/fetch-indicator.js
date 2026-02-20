export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { indicatorId } = req.body;

  const prompts = {
    vix: `Search for the current VIX index value right now. Reply ONLY with a JSON object, no other text: {"value": 18.5, "change": "+0.3", "asOf": "2026-02-20"}`,
    usdkrw: `Search for the current USD/KRW exchange rate right now. Reply ONLY with a JSON object, no other text: {"value": 1375.50, "change": "+2.30", "asOf": "2026-02-20"}`,
    hyspread: `Search for the current US High Yield OAS spread (ICE BofA US High Yield Index Option-Adjusted Spread) from FRED or Bloomberg right now. Reply ONLY with a JSON object, no other text: {"value": 3.12, "change": "-0.05", "asOf": "2026-02-20"}`,
  };

  if (!prompts[indicatorId]) {
    return res.status(400).json({ error: 'Invalid indicator ID' });
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
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompts[indicatorId] }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const text = data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('No JSON in response');

    const result = JSON.parse(match[0]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('fetch-indicator error:', err);
    return res.status(500).json({ error: err.message });
  }
}
