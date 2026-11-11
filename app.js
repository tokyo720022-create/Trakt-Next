// Trakt Next, first version: Log in with Trakt, show the account and the last watched items.
const C = window.TRAKT_CONFIG || {};
const API = 'https://api.trakt.tv';
const REDIRECT = 'traktnext://callback';
const plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
const app = document.getElementById('app');
const logoutBtn = document.getElementById('logout');

const tokens = {
  get() { try { return JSON.parse(localStorage.getItem('trakt_tokens')); } catch { return null; } },
  set(t) { localStorage.setItem('trakt_tokens', JSON.stringify(t)); },
  clear() { localStorage.removeItem('trakt_tokens'); },
};

function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

async function api(path, opts = {}) {
  const t = tokens.get();
  const isOauth = path.startsWith('/oauth');
  const headers = { 'Content-Type': 'application/json', 'trakt-api-version': '2', 'trakt-api-key': C.traktClientId };
  if (t && !isOauth) headers.Authorization = 'Bearer ' + t.access_token;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 401 && t && !isOauth && !opts.retried) {
    if (await refresh()) return api(path, { ...opts, retried: true });
    tokens.clear();
  }
  if (!res.ok) throw new Error(path + ' failed (' + res.status + ')');
  return res.json();
}

async function getToken(body) {
  const data = await api('/oauth/token', {
    method: 'POST',
    body: JSON.stringify({ client_id: C.traktClientId, redirect_uri: REDIRECT, ...body }),
  });
  tokens.set(data);
}

async function refresh() {
  const t = tokens.get();
  if (!t || !t.refresh_token) return false;
  try { await getToken({ refresh_token: t.refresh_token, grant_type: 'refresh_token' }); return true; } catch { return false; }
}

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function login() {
  // PKCE: a random verifier stays on the phone, only its SHA-256 hash (the challenge) goes to Trakt.
  const state = crypto.randomUUID();
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  localStorage.setItem('trakt_state', state);
  localStorage.setItem('trakt_verifier', verifier);
  const url = 'https://trakt.tv/oauth/authorize?response_type=code&client_id=' + encodeURIComponent(C.traktClientId) +
    '&redirect_uri=' + encodeURIComponent(REDIRECT) + '&state=' + state +
    '&code_challenge=' + challenge + '&code_challenge_method=S256';
  if (plugins.Browser) plugins.Browser.open({ url }); else window.open(url, '_blank');
}

if (plugins.App) {
  plugins.App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(REDIRECT)) return;
    try { await plugins.Browser.close(); } catch {}
    const p = new URL(url).searchParams;
    if (!p.get('code') || p.get('state') !== localStorage.getItem('trakt_state')) return render('Login check failed. Please try again.');
    try {
      await getToken({ code: p.get('code'), grant_type: 'authorization_code', code_verifier: localStorage.getItem('trakt_verifier') });
      localStorage.removeItem('trakt_verifier');
      render();
    } catch (e) { render('Login failed: ' + e.message); }
  });
}

function titleOf(h) {
  if (h.type === 'episode') return `${h.show.title} S${h.episode.season}E${h.episode.number}`;
  return (h.movie || h.show || {}).title || 'Unknown';
}

async function render(message) {
  app.replaceChildren();
  logoutBtn.hidden = !tokens.get();
  if (!C.traktClientId) { app.append(el('div', 'Trakt Client ID is missing. Add the TRAKT_CLIENT_ID secret in GitHub and rebuild.', 'card')); return; }
  if (message) app.append(el('div', message, 'card'));

  if (!tokens.get()) {
    const card = el('div', undefined, 'card');
    const btn = el('button', 'Log in with Trakt');
    btn.onclick = login;
    card.append(el('h2', 'Welcome'), btn);
    app.append(card);
    return;
  }

  const account = el('div', 'Loading…', 'card');
  const recent = el('div', 'Loading…', 'card');
  const simkl = el('div', undefined, 'card');
  simkl.append(el('h2', 'Simkl sync'), el('span', 'Coming in the next version.', 'muted'));
  app.append(account, recent, simkl);

  try {
    const me = await api('/users/settings');
    account.replaceChildren(el('h2', 'Trakt account'), el('div', me.user.username));
    const items = await api('/sync/history?limit=10');
    const list = el('ul');
    items.forEach(h => {
      const li = el('li', titleOf(h));
      li.append(el('br'), el('small', new Date(h.watched_at).toLocaleString()));
      list.append(li);
    });
    recent.replaceChildren(el('h2', 'Recently watched'), items.length ? list : el('span', 'No history yet.', 'muted'));
  } catch (e) {
    if (!tokens.get()) return render('Session expired. Please log in again.');
    account.replaceChildren(el('div', 'Could not load your data: ' + e.message));
    recent.remove();
  }
}

logoutBtn.onclick = () => { tokens.clear(); render(); };
render();
