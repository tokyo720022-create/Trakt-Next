/* start.js: builds every part once, then shows the login screen or the tab the user is on. */
class App {
  constructor() {
    this.store = new Store();
    const http = new HttpClient(Config.API_URL, () => ({ 'trakt-api-version': '2', 'trakt-api-key': Config.clientId }));
    this.auth = new TraktAuth(http, this.store);
    this.trakt = new TraktApi(this.auth);
    this.tabs = new Tabs((v) => this.go(v));
    this.current = 'home';
    this.lists = new ListScreen(this);
    this.customLists = new CustomLists(this);
    this.detail = new DetailScreen(this);
    this.history = new HistoryScreen(this);
    this.mark = new MarkSheet(this);
    this.episodeScreen = new EpisodeScreen(this);
    this.watching = new WatchingScreen(this);
    this.discover = new DiscoverScreen(this);
    this.streak = new StreakSheet(this);
    this.home = new HomeScreen(this);
    this.profile = new ProfileScreen(this);
  }

  start() {
    $('loginBtn').onclick = () => this.auth.startLogin();
    $('logoutBtn').onclick = () => { this.auth.logout(); this.trakt.reset(); this.current = 'home'; this.render(); };
    const cap = window.Capacitor && window.Capacitor.Plugins;
    if (cap && cap.App) {
      cap.App.addListener('appUrlOpen', ({ url }) => this.onLink(url));
      cap.App.addListener('backButton', () => this.back(cap.App));
    }
    this.render();
  }

  async onLink(url) {
    if (!url.startsWith(Config.REDIRECT_URI)) return;
    const cap = window.Capacitor && window.Capacitor.Plugins;
    try { if (cap && cap.Browser) await cap.Browser.close(); } catch (e) { /* nothing to close */ }
    try { if (await this.auth.handleCallback(url)) this.render(); } catch (err) { this.render('Login failed: ' + err.message); }
  }

  // The phone's back button closes the top sheet, then goes Home, then leaves the app.
  back(capApp) {
    const open = [...document.querySelectorAll('#overlays .sheet')].filter((s) => !s.hidden);
    if (open.length) { open[open.length - 1].querySelector('.sheethead .mini').click(); return; }
    if (this.auth.isLoggedIn && this.current !== 'home') { this.tabs.select('home'); return; }
    if (capApp && capApp.exitApp) capApp.exitApp();
  }

  toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.hidden = true; }, 2500);
  }

  showOnly(id) { document.querySelectorAll('#screens > section').forEach((s) => { s.hidden = s.id !== id; }); }

  render(message) {
    const on = this.auth.isLoggedIn;
    this.tabs.show(on);
    $('whoBar').hidden = true;
    if (!on) {
      this.showOnly('login');
      $('loginBtn').disabled = !Config.clientId;
      const text = Config.clientId ? message : 'Trakt Client ID is missing. Add the TRAKT_CLIENT_ID secret in GitHub and rebuild.';
      $('loginMsg').hidden = !text;
      $('loginMsg').textContent = text || '';
      return;
    }
    this.trakt.settings().then((me) => { $('whoName').textContent = me.user.username; $('whoBar').hidden = false; }).catch(() => {});
    this.tabs.select(this.current);
  }

  go(view) {
    this.current = view;
    const screen = { home: 'home', anime: 'lists', shows: 'lists', movies: 'lists', discover: 'discover', profile: 'profile' }[view];
    this.showOnly(screen);
    if (screen === 'lists') this.lists.open(view);
    else this[screen].open();
  }
}
