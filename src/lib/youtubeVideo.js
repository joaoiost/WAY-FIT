// Busca vídeo de demonstração via proxy server-side (/api/youtube-search).
// O proxy usa YOUTUBE_API_KEY (variável de servidor) — a chave nunca fica
// exposta no bundle do cliente e não sofre restrição de HTTP Referrer.
// Cache de 30 dias no localStorage para não repetir a mesma busca.

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

  const cacheKey = exerciseName.toLowerCase().replace(/\s+/g, '_');
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const query = videoSearch || `${exerciseName} execução correta academia`;

  try {
    const res = await fetch(
      `/api/youtube-search?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[YouTube] proxy error:', res.status, errData?.error);
      return null;
    }

    const data = await res.json();
    const url = data.url || null;
    // Cacheia apenas quando encontrou — null não é cacheado para re-tentar depois
    if (url) setCache(cacheKey, url);
    return url;
  } catch (e) {
    console.error('[YouTube] fetch error:', e.message);
    return null;
  }
}
