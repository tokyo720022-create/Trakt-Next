/* profile.js: the Profile screen: account, counts per section, sync routes. */
class ProfileScreen {
  constructor(app) { this.app = app; }

  async open() {
    const box = $('pfBody');
    box.replaceChildren(el('p', 'Loading…', 'muted'));
    const account = this.card('Trakt account');
    const counts = this.card('Your library');
    const routes = this.card('Sync routes');
    for (const { label, syncTo } of Object.values(KINDS)) routes.append(el('div', `${label} → Trakt, ${syncTo.join(', ')}`));
    routes.append(el('small', 'Simkl and AniList sync: coming soon.', 'muted'));
    try {
      const [me, lib] = await Promise.all([this.app.trakt.settings(), this.app.trakt.library()]);
      account.append(el('div', me.user.username));
      for (const [id, { label }] of Object.entries(KINDS)) {
        const mine = lib.filter((i) => kindOf(i) === id);
        const n = (flag) => mine.filter((i) => i.flags[flag]).length;
        counts.append(el('div', `${label}: ${n('watched')} watched · ${n('watchlist')} on watchlist · ${n('rated')} rated`));
      }
    } catch (err) { account.append(el('div', 'Could not load your account: ' + err.message)); }
    box.replaceChildren(account, counts, routes);
  }

  card(title) { const c = el('div', undefined, 'card'); c.append(el('h3', title, 'muted')); return c; }
}
