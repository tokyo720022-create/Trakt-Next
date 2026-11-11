/* auth.js: Log in with Trakt (OAuth code flow with PKCE, no client secret), keep the tokens, refresh them. */
class Pkce {
  static b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  // The verifier stays on the phone; only its SHA-256 hash (the challenge) goes to Trakt.
  static async create() {
    const verifier = Pkce.b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = Pkce.b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    return { verifier, challenge };
  }
}

class TraktAuth {
  constructor(http, store) { this.http = http; this.store = store; }

  get tokens() { return this.store.get('tokens'); }
  get isLoggedIn() { return Boolean(this.tokens); }

  async startLogin() {
    const state = crypto.randomUUID();
    const { verifier, challenge } = await Pkce.create();
    this.store.set('state', state);
    this.store.set('verifier', verifier);
    const params = new URLSearchParams({
      response_type: 'code', client_id: Config.clientId, redirect_uri: Config.REDIRECT_URI,
      state, code_challenge: challenge, code_challenge_method: 'S256',
    });
    const url = `${Config.AUTHORIZE_URL}?${params}`;
    const Browser = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
    if (Browser) await Browser.open({ url }); else window.open(url, '_blank');
  }

  // Called with the traktnext://callback?code=...&state=... link. Returns false when no login is waiting
  // (the same link can arrive twice), throws when the check fails.
  async handleCallback(url) {
    const state = this.store.get('state');
    if (!state) return false;
    const params = new URL(url).searchParams;
    if (!params.get('code') || params.get('state') !== state) throw new Error('Login check failed');
    const verifier = this.store.get('verifier');
    this.store.remove('state');
    this.store.remove('verifier');
    await this._exchange({ code: params.get('code'), grant_type: 'authorization_code', code_verifier: verifier });
    return true;
  }

  async refresh() {
    const t = this.tokens;
    if (!t || !t.refresh_token) return false;
    try { await this._exchange({ refresh_token: t.refresh_token, grant_type: 'refresh_token' }); return true; } catch (e) { return false; }
  }

  logout() { this.store.remove('tokens'); }

  async _exchange(body) {
    const data = await this.http.request('/oauth/token', { method: 'POST', body: { client_id: Config.clientId, redirect_uri: Config.REDIRECT_URI, ...body } });
    this.store.set('tokens', data);
  }
}
