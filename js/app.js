import { Config } from './core/Config.js';
import { Storage } from './core/Storage.js';
import { HttpClient } from './core/HttpClient.js';
import { TraktAuth } from './services/TraktAuth.js';
import { TraktApi } from './services/TraktApi.js';
import { SimklApi } from './services/SimklApi.js';
import { BottomNav } from './ui/BottomNav.js';
import { LoginView } from './views/LoginView.js';
import { HomeView } from './views/HomeView.js';
import { ProfileView } from './views/ProfileView.js';
import { el } from './utils/dom.js';

// Entry point: builds the services once, then shows Login, or Home / Profile with the bottom nav.
class TraktNextApp {
  constructor() {
    this.root = document.getElementById('app');
    this.logoutButton = document.getElementById('logout');
    const authHttp = new HttpClient(Config.API_URL, () => ({
      'trakt-api-version': '2',
      'trakt-api-key': Config.traktClientId,
    }));
    const auth = new TraktAuth(authHttp, new Storage());
    this.ctx = { auth, trakt: new TraktApi(auth), simkl: new SimklApi(), state: { kind: 'movies' } };
    this.tab = 'home';
    this.nav = new BottomNav(
      [{ id: 'home', label: 'Home', icon: '🏠' }, { id: 'profile', label: 'Profile', icon: '👤' }],
      (id) => { this.tab = id; this.show(); },
    );
  }

  start() {
    this.logoutButton.onclick = () => { this.ctx.auth.logout(); this.tab = 'home'; this.show(); };
    window.Capacitor?.Plugins?.App?.addListener('appUrlOpen', ({ url }) => this.onDeepLink(url));
    this.show();
  }

  async onDeepLink(url) {
    if (!url.startsWith(Config.REDIRECT_URI)) return;
    try { await window.Capacitor?.Plugins?.Browser?.close(); } catch { /* nothing to close */ }
    try { await this.ctx.auth.handleCallback(url); this.show(); }
    catch (err) { this.show('Login failed: ' + err.message); }
  }

  async show(message) {
    const loggedIn = this.ctx.auth.isLoggedIn;
    this.root.replaceChildren();
    this.logoutButton.hidden = !loggedIn;
    if (!Config.traktClientId) {
      this.nav.hide();
      this.root.append(el('div', 'Trakt Client ID is missing. Add the TRAKT_CLIENT_ID secret in GitHub and rebuild.', 'card'));
      return;
    }
    if (message) this.root.append(el('div', message, 'card'));
    if (loggedIn) this.nav.render(this.tab); else this.nav.hide();
    const View = !loggedIn ? LoginView : this.tab === 'profile' ? ProfileView : HomeView;
    await new View(this.ctx).render(this.root);
  }
}

new TraktNextApp().start();
