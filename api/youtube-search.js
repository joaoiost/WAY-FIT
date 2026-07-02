// Proxy server-side para busca de vídeo no YouTube.
// Chamado pelo cliente em /api/youtube-search?q=<exercicio>
// A chave fica no servidor → nunca exposta no bundle do cliente.
// No Vercel: adicione YOUTUBE_API_KEY nas variáveis de ambiente (Settings → Env Vars).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query?.q;
  if (!q) return res.status(400).json({ error: 'Parâmetro q obrigatório' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'YOUTUBE_API_KEY não configurada no servidor' });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=1&relevanceLanguage=pt&regionCode=BR&key=${apiKey}`;
    const ytRes = await fetch(url);

    if (!ytRes.ok) {
      const err = await ytRes.json().catch(() => ({}));
      console.error('[youtube-search] API error:', ytRes.status, err?.error?.message);
      return res.status(ytRes.status).json({ error: err?.error?.message || 'Erro YouTube API' });
    }

    const data = await ytRes.json();
    const videoId = data.items?.[0]?.id?.videoId || null;
    return res.status(200).json({ videoId, url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null });
  } catch (e) {
    console.error('[youtube-search] fetch error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
