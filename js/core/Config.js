// Settings. The Client ID is written into config.js by the build from the TRAKT_CLIENT_ID secret.
export class Config {
  static API_URL = 'https://api.trakt.tv';
  static AUTHORIZE_URL = 'https://trakt.tv/oauth/authorize';
  static REDIRECT_URI = 'traktnext://callback';
  static get raw() { return window.TRAKT_CONFIG || {}; }
  static get traktClientId() { return Config.raw.traktClientId || ''; }
  static get simklClientId() { return Config.raw.simklClientId || ''; }
}
