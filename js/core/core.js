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

// Trakt image links come without https:// and carry a size in the path (thumb, medium, original).
function imageUrl(value, size) {
  const u = Array.isArray(value) ? value[0] : value;
  if (!u) return '';
  const url = /^https?:/.test(u) ? u : 'https://' + u;
  return size ? url.replace(/\/(thumb|medium|original|full)\//, '/' + size + '/') : url;
}
const posterOf = (media, size) => imageUrl(media.images && media.images.poster, size);
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

// Trakt ratings go from 1 to 10; the app shows them as 5 stars like the Trakt app (10 = 5 stars).
const stars5 = (rating) => String(rating / 2);
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '');
const fmtRuntime = (min) => (min ? `${Math.floor(min / 60) ? Math.floor(min / 60) + 'h ' : ''}${min % 60}m` : '');
const compact = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n || 0));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function openLink(url) {
  const Browser = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
  if (Browser) Browser.open({ url }); else window.open(url, '_blank');
}

// minutes -> "2d 10h 30m"
function fmtSpan(min) {
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = Math.round(min % 60);
  return [d ? d + 'd' : '', h ? h + 'h' : '', m || (!d && !h) ? m + 'm' : ''].filter(Boolean).join(' ');
}

// The score pills of the Trakt app from a /ratings response: Trakt %, IMDb, Rotten Tomatoes (critics, audience), MAL.
function ratingPills(r) {
  if (!r) return [];
  const out = [];
  const trakt = (r.trakt && r.trakt.rating) || r.rating;
  if (trakt) out.push('★ ' + Math.round(trakt * 10) + '%');
  if (r.imdb && r.imdb.rating) out.push('IMDb ' + Number(r.imdb.rating).toFixed(1));
  const rt = r.rotten_tomatoes;
  if (rt && rt.rating) out.push('🍅 ' + Math.round(rt.rating) + '%');
  if (rt && rt.user_rating) out.push('🍿 ' + Math.round(rt.user_rating) + '%');
  if (r.mal && r.mal.rating) out.push('MAL ' + Number(r.mal.rating).toFixed(2));
  return out;
}
