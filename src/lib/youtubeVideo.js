// Busca automática de vídeo do YouTube por exercício
// Cache no localStorage por 30 dias — evita gastar quota na mesma busca
// Quota gratuita: 10.000 units/dia | cada busca = 100 units = 100 buscas/dia grátis

const CACHE_PREFIX = 'yt_vid_';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    const { url, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + key); return undefined; }
    return url; // null = "buscou mas não achou"
  } catch { return undefined; }
}

function setCache(key, url) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ url, ts: Date.now() }));
  } catch {}
}

export async function fetchExerciseVideo(exerciseName, videoSearch) {
  if (!exerciseName || exerciseName.length < 3) return null;

  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const cacheKey = exerciseName.toLowerCase().replace(/\s+/g, '_');
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const query = videoSearch || `${exerciseName} execução correta academia`;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&relevanceLanguage=pt&regionCode=BR&key=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[YouTube] erro API:', res.status, errData?.error?.message);
      return null;
    }

    const data = await res.json();
    const videoId = data.items?.[0]?.id?.videoId;
    if (!videoId) return null;

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    setCache(cacheKey, url);
    return url;
  } catch (e) {
    console.error('[YouTube] erro fetch:', e.message);
    return null;
  }
}
