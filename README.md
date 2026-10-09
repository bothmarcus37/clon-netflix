# Clon de Netflix

Catálogo de películas y series con datos de [TMDB](https://www.themoviedb.org/). Proyecto académico, sin fines de lucro y sin relación con Netflix, Inc.

## Qué hace
- Vistas de Inicio, Series, Películas y Novedades populares, con filas por categoría y Top 10.
- Buscador de películas y series.
- Ficha de cada título con tráiler de YouTube, reparto y recomendaciones.
- Textos en español de México (`es-MX`).

## Cómo ejecutarlo
1. Consigue una clave gratuita en https://www.themoviedb.org/settings/api.
2. Escríbela en `js/config.js`, o deja ese campo vacío y la aplicación te la pide al abrir.
3. Ábrelo desde un servidor local (por ejemplo `http://localhost/netflix/` con XAMPP, o `iniciar.bat`). Los tráilers no se reproducen si abres el archivo directamente.

## Hecho con
HTML, CSS y JavaScript sin frameworks, Fetch API y la API de TMDB.

Este producto utiliza la API de TMDB, pero no está avalado ni certificado por TMDB.
