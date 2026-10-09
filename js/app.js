// Interfaz del clon de Netflix: filas de títulos, buscador y reproductor de tráilers
const $ = sel => document.querySelector(sel);
const app = $('#app');
const modal = $('#modal');
const modalContent = $('#modal-content');
const searchInput = $('#search');

// Filas de cada vista: título visible + endpoint de TMDB que la alimenta
const VIEWS = {
  inicio: [
    { title: 'Tendencias ahora', path: '/trending/all/week' },
    { title: 'Las 10 películas más populares hoy', path: '/trending/movie/day', type: 'movie', top10: true },
    { title: 'En cines ahora', path: '/movie/now_playing', type: 'movie', region: true },
    { title: 'Películas populares', path: '/movie/popular', type: 'movie' },
    { title: 'Series populares', path: '/tv/popular', type: 'tv' },
    { title: 'Próximos estrenos', path: '/movie/upcoming', type: 'movie', region: true },
    { title: 'Mejor valoradas', path: '/movie/top_rated', type: 'movie' },
    { title: 'Acción', path: '/discover/movie', type: 'movie', params: { with_genres: 28 } },
    { title: 'Ciencia ficción', path: '/discover/movie', type: 'movie', params: { with_genres: 878 } },
    { title: 'Terror', path: '/discover/movie', type: 'movie', params: { with_genres: 27 } },
    { title: 'Animación', path: '/discover/movie', type: 'movie', params: { with_genres: 16 } },
  ],
  peliculas: [
    { title: 'Películas en tendencia', path: '/trending/movie/week', type: 'movie' },
    { title: 'En cines ahora', path: '/movie/now_playing', type: 'movie', region: true },
    { title: 'Populares', path: '/movie/popular', type: 'movie' },
    { title: 'Mejor valoradas', path: '/movie/top_rated', type: 'movie' },
    { title: 'Próximos estrenos', path: '/movie/upcoming', type: 'movie', region: true },
    { title: 'Comedia', path: '/discover/movie', type: 'movie', params: { with_genres: 35 } },
    { title: 'Aventura', path: '/discover/movie', type: 'movie', params: { with_genres: 12 } },
    { title: 'Drama', path: '/discover/movie', type: 'movie', params: { with_genres: 18 } },
  ],
  series: [
    { title: 'Series en tendencia', path: '/trending/tv/week', type: 'tv' },
    { title: 'Las 10 series más populares hoy', path: '/trending/tv/day', type: 'tv', top10: true },
    { title: 'Populares', path: '/tv/popular', type: 'tv' },
    { title: 'Mejor valoradas', path: '/tv/top_rated', type: 'tv' },
    { title: 'En emisión', path: '/tv/on_the_air', type: 'tv' },
    { title: 'Acción y aventura', path: '/discover/tv', type: 'tv', params: { with_genres: 10759 } },
    { title: 'Animación', path: '/discover/tv', type: 'tv', params: { with_genres: 16 } },
    { title: 'Drama', path: '/discover/tv', type: 'tv', params: { with_genres: 18 } },
  ],
  novedades: [
    { title: 'Novedades en Netflix', path: '/trending/all/day' },
    { title: 'Las 10 películas más populares hoy', path: '/trending/movie/day', type: 'movie', top10: true },
    { title: 'Próximos estrenos', path: '/movie/upcoming', type: 'movie', region: true },
    { title: 'Las 10 series más populares hoy', path: '/trending/tv/day', type: 'tv', top10: true },
    { title: 'Series que se emiten hoy', path: '/tv/airing_today', type: 'tv' },
    { title: 'Vale la pena esperar', path: '/movie/now_playing', type: 'movie', region: true },
  ],
};

let currentView = null;   // hash de la vista dibujada bajo el modal
let renderToken = 0;      // descarta respuestas de vistas que ya no se muestran

/* ---------- Utilidades ---------- */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const titleOf = i => i.title || i.name || 'Sin título';
const yearOf = i => (i.release_date || i.first_air_date || '').slice(0, 4);
const typeOf = (i, fallback) => i.media_type || fallback || (i.first_air_date ? 'tv' : 'movie');
// Valoración de TMDB (0-10) mostrada como porcentaje, al estilo "% de coincidencia"
const match = i => (i.vote_average ? `${Math.round(i.vote_average * 10)} % de coincidencia` : 'Nuevo');

// Tarjeta horizontal; con `rank` se dibuja como elemento del Top 10 (número + póster)
function cardHTML(item, fallbackType, rank) {
  const type = typeOf(item, fallbackType);
  const title = esc(titleOf(item));
  if (rank) {
    return `
      <a class="card top10" href="#/${type}/${item.id}" title="${title}">
        <span class="rank">${rank}</span>
        <img src="${TMDB.img(item.poster_path, 'w342')}" alt="${title}" loading="lazy">
      </a>`;
  }
  const image = TMDB.img(item.backdrop_path, 'w500') || TMDB.img(item.poster_path, 'w342');
  return `
    <a class="card" href="#/${type}/${item.id}" title="${title}">
      ${image ? `<img src="${image}" alt="" loading="lazy">` : ''}
      <span class="play-dot">▶</span>
      <div class="card-info">
        <strong>${title}</strong>
        <div class="card-meta"><b>${match(item)}</b> · ${yearOf(item) || 's/f'} · ${type === 'tv' ? 'Serie' : 'Película'}</div>
      </div>
    </a>`;
}

/* ---------- Vistas ---------- */

async function showView(name) {
  const token = ++renderToken;
  const rows = VIEWS[name];
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.classList.toggle('active', a.dataset.view === name));

  app.innerHTML = `<section class="hero skeleton" id="hero"></section>` +
    rows.map((r, i) => `
      <section class="row">
        <h2>${esc(r.title)}</h2>
        <div class="row-wrap">
          <button class="row-arrow left" data-dir="-1" aria-label="Anterior">‹</button>
          <div class="row-track" id="row-${i}">${'<div class="card skeleton"></div>'.repeat(8)}</div>
          <button class="row-arrow right" data-dir="1" aria-label="Siguiente">›</button>
        </div>
      </section>`).join('');

  rows.forEach(async (r, i) => {
    try {
      const params = { ...r.params, ...(r.region ? { region: CONFIG.REGION } : {}) };
      const items = (await TMDB.list(r.path, params)).filter(x => x.media_type !== 'person');
      if (token !== renderToken) return;
      $(`#row-${i}`).innerHTML = r.top10
        ? items.filter(x => x.poster_path).slice(0, 10).map((x, n) => cardHTML(x, r.type, n + 1)).join('')
        : items.map(x => cardHTML(x, r.type)).join('');
      if (i === 0) renderHero(items, r.type);
    } catch (err) {
      if (token === renderToken) handleError(err, $(`#row-${i}`));
    }
  });
}

function renderHero(items, fallbackType) {
  const candidates = items.filter(i => i.backdrop_path && i.overview).slice(0, 6);
  const pick = Math.floor(Math.random() * candidates.length);
  const item = candidates[pick];
  const hero = $('#hero');
  if (!item || !hero) return;
  const type = typeOf(item, fallbackType);
  hero.classList.remove('skeleton');
  hero.style.backgroundImage = `url(${TMDB.img(item.backdrop_path, 'original')})`;
  hero.innerHTML = `
    <div class="hero-content">
      <span class="n-series"><i>N</i>${type === 'tv' ? 'SERIE' : 'PELÍCULA'}</span>
      <h1>${esc(titleOf(item))}</h1>
      <p class="hero-rank"><span class="top-badge">TOP<b>10</b></span> N.º ${pick + 1} en tendencias hoy</p>
      <p class="hero-overview">${esc(item.overview)}</p>
      <div class="hero-actions">
        <a class="btn btn-white" href="#/${type}/${item.id}">▶ Reproducir</a>
        <a class="btn btn-gray" href="#/${type}/${item.id}">ⓘ Más información</a>
      </div>
    </div>`;
}

async function showSearch(query) {
  const token = ++renderToken;
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (searchInput.value.trim() !== query) searchInput.value = query;
  app.innerHTML = `<section class="results"><h2>Resultados de la búsqueda: <b>${esc(query)}</b></h2>
    <div class="grid" id="grid">${'<div class="card skeleton"></div>'.repeat(12)}</div></section>`;
  try {
    const items = await TMDB.search(query);
    if (token !== renderToken) return;
    $('#grid').innerHTML = items.length
      ? items.map(x => cardHTML(x)).join('')
      : `<p class="empty">No encontramos títulos que coincidan con tu búsqueda.</p>`;
  } catch (err) {
    if (token === renderToken) handleError(err, $('#grid'));
  }
}

/* ---------- Modal de detalle y tráiler ---------- */

// Solo tráilers y teasers de YouTube; primero los oficiales en español
function pickTrailers(videos) {
  const score = v =>
    (v.type === 'Trailer' ? 4 : 0) + (v.iso_639_1 === 'es' ? 2 : 0) + (v.official ? 1 : 0);
  return (videos?.results || [])
    .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    .sort((a, b) => score(b) - score(a));
}

const playerHTML = key => `
  <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(key)}?autoplay=1&rel=0&modestbranding=1"
    title="Tráiler" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;

async function openTitle(type, id) {
  modal.hidden = false;
  document.body.classList.add('no-scroll');
  modalContent.innerHTML = `<div class="player skeleton"></div>`;
  try {
    const d = await TMDB.details(type, id);
    if (location.hash !== `#/${type}/${id}`) return;
    const trailers = pickTrailers(d.videos);
    const backdrop = TMDB.img(d.backdrop_path, 'w1280');
    const length = type === 'tv'
      ? `${d.number_of_seasons || '?'} temporada${d.number_of_seasons === 1 ? '' : 's'}`
      : (d.runtime ? `${Math.floor(d.runtime / 60)} h ${d.runtime % 60} min` : '');
    const cast = (d.credits?.cast || []).slice(0, 6).map(c => c.name).join(', ');
    const recs = (d.recommendations?.results || []).filter(r => r.backdrop_path).slice(0, 12);

    modalContent.innerHTML = `
      <div class="player" id="player">
        ${trailers.length
          ? playerHTML(trailers[0].key)
          : `<div class="no-trailer" style="background-image:url(${backdrop})"><span>Este título aún no tiene tráiler disponible</span></div>`}
      </div>
      <div class="modal-body">
        <h2 id="modal-title">${esc(titleOf(d))}</h2>
        <div class="modal-cols">
          <div>
            <p class="meta">
              <span class="match">${match(d)}</span>
              <span>${yearOf(d)}</span>
              ${length ? `<span>${length}</span>` : ''}
              <span class="tag">HD</span>
              <span class="tag">${type === 'tv' ? 'Serie' : 'Película'}</span>
            </p>
            ${d.tagline ? `<p class="tagline">${esc(d.tagline)}</p>` : ''}
            <p>${esc(d.overview || 'Sin sinopsis disponible en español.')}</p>
          </div>
          <div>
            ${cast ? `<p class="small"><b>Elenco:</b> ${esc(cast)}</p>` : ''}
            <p class="small"><b>Géneros:</b> ${esc((d.genres || []).map(g => g.name).join(', ') || '—')}</p>
            <p class="small"><b>Valoración TMDB:</b> ${d.vote_average ? d.vote_average.toFixed(1) : '–'} / 10</p>
          </div>
        </div>
        ${trailers.length > 1 ? `
          <h3>Tráilers y más</h3>
          <div class="chips">${trailers.map((v, i) => `
            <button class="chip${i === 0 ? ' active' : ''}" data-video="${esc(v.key)}">▶ ${esc(v.name)}</button>`).join('')}
          </div>` : ''}
        ${recs.length ? `
          <h3>Más títulos similares a este</h3>
          <div class="grid small-grid">${recs.map(r => cardHTML(r, type)).join('')}</div>` : ''}
      </div>`;
    modal.scrollTop = 0;
  } catch (err) {
    handleError(err, modalContent);
  }
}

function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  modalContent.innerHTML = ''; // detiene el video
  document.body.classList.remove('no-scroll');
}

/* ---------- Errores y configuración de la clave ---------- */

function handleError(err, container) {
  if (err.status === 401) {
    TMDB.clearKey();
    showSetup('La clave de API no es válida. Revísala e inténtalo de nuevo.');
    return;
  }
  console.error(err);
  if (container) container.innerHTML =
    `<p class="empty">No se pudo cargar el contenido. Revisa tu conexión a internet.</p>`;
}

function showSetup(message) {
  const error = $('#setup-error');
  error.hidden = !message;
  error.textContent = message || '';
  $('#setup').hidden = false;
}

$('#setup-form').addEventListener('submit', e => {
  e.preventDefault();
  TMDB.setKey($('#setup-key').value);
  location.reload();
});

/* ---------- Navegación por hash ---------- */
// #/  #/peliculas  #/series  #/buscar/<texto>  #/movie/<id>  #/tv/<id>

function route() {
  if (!TMDB.getKey()) return showSetup();
  const [a, b] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);

  if ((a === 'movie' || a === 'tv') && /^\d+$/.test(b || '')) {
    if (!currentView) { currentView = '#/'; showView('inicio'); }
    return openTitle(a, b);
  }

  closeModal();
  const hash = location.hash || '#/';
  if (hash === currentView) return;
  currentView = hash;
  window.scrollTo(0, 0);
  if (a === 'buscar' && b) return showSearch(b);
  if (a !== 'buscar') searchInput.value = '';
  showView(VIEWS[a] ? a : 'inicio');
}

/* ---------- Eventos ---------- */

window.addEventListener('hashchange', route);
window.addEventListener('scroll', () => $('#nav').classList.toggle('solid', scrollY > 40));

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value.trim();
    location.hash = q ? `#/buscar/${encodeURIComponent(q)}` : '#/';
  }, 400);
});

// Flechas de desplazamiento de las filas
app.addEventListener('click', e => {
  const arrow = e.target.closest('.row-arrow');
  if (!arrow) return;
  const track = arrow.parentElement.querySelector('.row-track');
  track.scrollBy({ left: arrow.dataset.dir * track.clientWidth * 0.85, behavior: 'smooth' });
});

modal.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return void (location.hash = currentView || '#/');
  const chip = e.target.closest('.chip');
  if (chip) {
    modal.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
    $('#player').innerHTML = playerHTML(chip.dataset.video);
    modal.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) location.hash = currentView || '#/';
});

route();
