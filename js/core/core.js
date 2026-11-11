/* core.js: small helpers and settings shared by every file. Loaded first. */
const $ = (id) => document.getElementById(id);

function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}

class Config {
  static API_URL = 'https://api.trakt.tv';
  static AUTHORIZE_URL = 'https://trakt.tv/oauth/authorize';
  static REDIRECT_URI = 'traktnext://callback';
  // The Client ID is written into config.js by the build from the TRAKT_CLIENT_ID secret.
  static get clientId() { return (window.TRAKT_CONFIG || {}).traktClientId || ''; }
}

// localStorage with a prefix, values stored as JSON.
class Store {
  constructor(prefix = 'traktnext:') { this.prefix = prefix; }
  get(key) { try { return JSON.parse(localStorage.getItem(this.prefix + key)); } catch (e) { return null; } }
  set(key, value) { localStorage.setItem(this.prefix + key, JSON.stringify(value)); }
  remove(key) { localStorage.removeItem(this.prefix + key); }
}

// JSON over fetch. defaultHeaders is a function so tokens are read fresh on every request.
class HttpClient {
  constructor(baseUrl, defaultHeaders = () => ({})) { this.baseUrl = baseUrl; this.defaultHeaders = defaultHeaders; }
  async request(path, { method = 'GET', body } = {}) {
    const res = await fetch(this.baseUrl + path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json', ...this.defaultHeaders() },
    });
    if (!res.ok) { const err = new Error(`${path.split('?')[0]} failed (${res.status})`); err.status = res.status; throw err; }
    return res.json();
  }
}

// The three sections, and where a change made in each one is also meant to go besides Trakt.
const KINDS = {
  anime: { label: 'Anime', syncTo: ['AniList', 'Simkl'] },
  shows: { label: 'TV Shows', syncTo: ['Simkl'] },
  movies: { label: 'Movies', syncTo: ['Simkl'] },
};

// Items look like { type: 'movie' | 'show', movie | show: {...}, flags, rating, plays, when }.
const mediaOf = (item) => item.movie || item.show || {};
// Trakt marks anime with the "anime" genre; everything else is a movie or a TV show.
const kindOf = (item) => ((mediaOf(item).genres || []).includes('anime') ? 'anime' : item.type === 'movie' ? 'movies' : 'shows');

function imageUrl(value) {
  const u = Array.isArray(value) ? value[0] : value;
  return u ? (/^https?:/.test(u) ? u : 'https://' + u) : '';
}
const posterOf = (media) => imageUrl(media.images && media.images.poster);
const thumbOf = (media) => imageUrl(media.images && (media.images.thumb || media.images.fanart)) || posterOf(media);

function setImage(node, url, fallbackText) {
  if (url) node.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
  else node.textContent = fallbackText || '';
}

const dateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dateKey(d) === dateKey(now)) return 'Today';
  if (dateKey(d) === dateKey(yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
