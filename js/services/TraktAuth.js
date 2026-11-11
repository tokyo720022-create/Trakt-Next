import { Config } from '../core/Config.js';
import { createPkcePair, randomState } from '../utils/pkce.js';

// Log in with Trakt (OAuth code flow with PKCE), keep the tokens, refresh them, log out.
export class TraktAuth {
  constructor(http, storage) {
    this.http = http;
    this.storage = storage;
  }

  get tokens() { return this.storage.get('tokens'); }
  get isLoggedIn() { return Boolean(this.tokens); }

  async startLogin() {
    const state = randomState();
    const { verifier, challenge } = await createPkcePair();
    this.storage.set('state', state);
    this.storage.set('verifier', verifier);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: Config.traktClientId,
      redirect_uri: Config.REDIRECT_URI,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const url = `${Config.AUTHORIZE_URL}?${params}`;
    const Browser = window.Capacitor?.Plugins?.Browser;
    if (Browser) await Browser.open({ url }); else window.open(url, '_blank');
  }

  // Called with the traktnext://callback?code=...&state=... link. Throws if the login cannot be completed.
  async handleCallback(url) {
    const params = new URL(url).searchParams;
    const code = params.get('code');
    if (!code || params.get('state') !== this.storage.get('state')) throw new Error('Login check failed');
    await this._exchange({ code, grant_type: 'authorization_code', code_verifier: this.storage.get('verifier') });
    this.storage.remove('state');
    this.storage.remove('verifier');
  }

  async refresh() {
    const t = this.tokens;
    if (!t?.refresh_token) return false;
    try { await this._exchange({ refresh_token: t.refresh_token, grant_type: 'refresh_token' }); return true; }
    catch { return false; }
  }

  logout() { this.storage.remove('tokens'); }

  async _exchange(body) {
    const data = await this.http.request('/oauth/token', {
      method: 'POST',
      body: { client_id: Config.traktClientId, redirect_uri: Config.REDIRECT_URI, ...body },
    });
    this.storage.set('tokens', data);
  }
}
