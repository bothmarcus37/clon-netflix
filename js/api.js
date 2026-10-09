// Cliente de la API de TMDB (The Movie Database)
const TMDB = (() => {
  const BASE = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p/';
  const STORAGE_KEY = 'netflix.tmdbKey';

  function getKey() {
    if (CONFIG.TMDB_API_KEY) return CONFIG.TMDB_API_KEY.trim();
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  }

  function setKey(key) {
    try { localStorage.setItem(STORAGE_KEY, key.trim()); } catch { /* sin almacenamiento */ }
  }

  function clearKey() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin almacenamiento */ }
  }

  // Petición GET genérica. Acepta clave v3 (parámetro api_key) o token v4 (Bearer).
  async function get(path, params = {}) {
    const key = getKey();
    const url = new URL(BASE + path);
    url.searchParams.set('language', CONFIG.LANGUAGE);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const headers = { accept: 'application/json' };
    if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
    else url.searchParams.set('api_key', key);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = new Error(`TMDB respondió ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // Lista de títulos (tendencias, populares, por género, etc.)
  const list = (path, params) => get(path, params).then(d => d.results || []);

  // Búsqueda combinada de películas y series
  const search = query =>
    list('/search/multi', { query, include_adult: 'false' })
      .then(r => r.filter(i => i.media_type === 'movie' || i.media_type === 'tv'));

  // Detalle de un título con sus videos, reparto y recomendaciones en una sola llamada
  const details = (type, id) =>
    get(`/${type}/${id}`, {
      append_to_response: 'videos,credits,recommendations',
      include_video_language: 'es,en,null',
    });

  const img = (path, size) => (path ? `${IMG}${size}${path}` : '');

  return { getKey, setKey, clearKey, list, search, details, img };
})();
