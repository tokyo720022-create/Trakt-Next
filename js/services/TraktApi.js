import { Config } from '../core/Config.js';
import { HttpClient } from '../core/HttpClient.js';

// Calls to the Trakt API for the logged-in user. A 401 triggers one token refresh and a retry.
export class TraktApi {
  constructor(auth) {
    this.auth = auth;
    this.http = new HttpClient(Config.API_URL, () => {
      const headers = { 'trakt-api-version': '2', 'trakt-api-key': Config.traktClientId };
      const t = auth.tokens;
      if (t) headers.Authorization = 'Bearer ' + t.access_token;
      return headers;
    });
  }

  async get(path) {
    try { return await this.http.request(path); }
    catch (err) {
      if (err.status !== 401) throw err;
      if (await this.auth.refresh()) return this.http.request(path);
      this.auth.logout();
      throw err;
    }
  }

  getSettings() { return this.get('/users/settings'); }
  getHistory(limit = 10) { return this.get('/sync/history?extended=full&limit=' + limit); }
}
