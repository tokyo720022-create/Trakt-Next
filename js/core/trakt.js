/* trakt.js: every call to the Trakt API. */
class TraktApi {
  static EXT = 'extended=full,images';

  constructor(auth) {
    this.auth = auth;
    this.cache = null; // the user's library, kept in memory only
    this.memos = new Map();
    this.http = new HttpClient(Config.API_URL, () => {
      const headers = { 'trakt-api-version': '2', 'trakt-api-key': Config.clientId };
      const t = auth.tokens;
      if (t) headers.Authorization = 'Bearer ' + t.access_token;
      return headers;
    });
  }

  // One request. A 401 triggers one token refresh and a retry.
  async call(path, method = 'GET', body) {
    try { return await this.http.request(path, { method, body }); } catch (err) {
      if (err.status !== 401) throw err;
      if (await this.auth.refresh()) return this.http.request(path, { method, body });
      this.auth.logout();
      throw err;
    }
  }

  reset() { this.cache = null; this.memos.clear(); }

  // Remembers a result for a short time, so switching screens does not repeat the same calls.
  memo(key, fn, ttl = 120000) {
    const hit = this.memos.get(key);
    if (hit && Date.now() - hit.at < ttl) return hit.value;
    const value = fn();
    this.memos.set(key, { at: Date.now(), value });
    value.catch(() => this.memos.delete(key));
    return value;
  }

  settings() { return this.call('/users/settings'); }

  // Everything the user has watched, put on a watchlist or rated, one item per title.
  async library(force = false) {
    if (this.cache && !force) return this.cache;
    const x = TraktApi.EXT;
    const [wm, ws, wl, rt] = await Promise.all([
      this.call('/sync/watched/movies?' + x), this.call('/sync/watched/shows?' + x),
      this.call('/sync/watchlist?' + x), this.call('/sync/ratings?' + x),
    ]);
    const map = new Map();
    const add = (type, media, flag, extra = {}) => {
      if (!media || !media.ids) return;
      const key = type + ':' + media.ids.trakt;
      const it = map.get(key) || { type, [type]: media, flags: {}, rating: 0, plays: 0, when: '' };
      it.flags[flag] = true;
      it.plays = extra.plays || it.plays;
      it.rating = extra.rating || it.rating;
      if (extra.when && extra.when > it.when) it.when = extra.when;
      map.set(key, it);
    };
    const isTitle = (r) => r.type === 'movie' || r.type === 'show';
    wm.forEach((r) => add('movie', r.movie, 'watched', { plays: r.plays, when: r.last_watched_at }));
    ws.forEach((r) => add('show', r.show, 'watched', { plays: r.plays, when: r.last_watched_at }));
    wl.filter(isTitle).forEach((r) => add(r.type, r[r.type], 'watchlist', { when: r.listed_at }));
    rt.filter(isTitle).forEach((r) => add(r.type, r[r.type], 'rated', { rating: r.rating, when: r.rated_at }));
    this.cache = [...map.values()];
    return this.cache;
  }

  sameTitle(a, b) { return a.type === b.type && a[a.type].ids.trakt === b[b.type].ids.trakt; }

  // The library copy of a title, or null when the user has nothing on it yet.
  async find(item) { return (await this.library()).find((i) => this.sameTitle(i, item)) || null; }

  async tracked(item) {
    const lib = await this.library();
    let found = lib.find((i) => this.sameTitle(i, item));
    if (!found) { found = { type: item.type, [item.type]: mediaOf(item), flags: {}, rating: 0, plays: 0, when: '' }; lib.push(found); }
    return found;
  }

  ratingOf(item) {
    const type = item.type === 'movie' ? 'movie' : 'show';
    const found = (this.cache || []).find((i) => this.sameTitle(i, { type, [type]: mediaOf(item) }));
    return found ? found.rating : 0;
  }

  // ---- changes: each one is sent to Trakt first, then the local copy is updated ----
  body(item, extra = {}) { return { [item.type + 's']: [{ ids: { trakt: mediaOf(item).ids.trakt }, ...extra }] }; }

  async setWatchlist(item, on) {
    await this.call('/sync/watchlist' + (on ? '' : '/remove'), 'POST', this.body(item));
    (await this.tracked(item)).flags.watchlist = on;
  }

  // at: when it was watched (an ISO date), or nothing for "just now". Movies only; a show is tracked episode by episode.
  async setWatched(item, on, at) {
    await this.call('/sync/history' + (on ? '' : '/remove'), 'POST', this.body(item, on && at ? { watched_at: at } : {}));
    const t = await this.tracked(item);
    t.flags.watched = on;
    t.plays = on ? Math.max(1, t.plays) : 0;
  }

  async rate(item, rating) {
    await this.call('/sync/ratings' + (rating ? '' : '/remove'), 'POST', this.body(item, rating ? { rating } : {}));
    const t = await this.tracked(item);
    t.rating = rating;
    t.flags.rated = Boolean(rating);
  }

  async markEpisode(episode) {
    await this.call('/sync/history', 'POST', { episodes: [{ ids: { trakt: episode.ids.trakt } }] });
    this.memos.delete('recent');
    this.memos.delete('activity');
  }

  // Marks the next episode of a row watched and returns the row with fresh numbers, or null when nothing is left.
  async advance(row) {
    await this.markEpisode(row.next);
    const fresh = await this.progress(row.show);
    return fresh && fresh.left > 0 ? Object.assign(row, fresh) : null;
  }

  // ---- custom lists ----
  customLists() { return this.call('/users/me/lists'); }
  createList(name) { return this.call('/users/me/lists', 'POST', { name, privacy: 'private' }); }
  listItems(id) { return this.call(`/users/me/lists/${id}/items?${TraktApi.EXT}`); }
  addToList(id, item) { return this.call(`/users/me/lists/${id}/items`, 'POST', this.body(item)); }

  // ---- discover ----
  // mode: trending | popular | anticipated | foryou. kind: anime | shows | movies | all.
  async discover(mode, kind, page = 1) {
    const types = kind === 'movies' ? ['movies'] : kind === 'shows' ? ['shows'] : ['shows', 'movies'];
    const genre = kind === 'anime' ? '&genres=anime' : '';
    const lists = await Promise.all(types.map(async (t) => {
      const type = t === 'movies' ? 'movie' : 'show';
      const path = mode === 'foryou' ? `/recommendations/${t}?` : `/${t}/${mode}?`;
      const raw = await this.call(`${path}${TraktApi.EXT}&page=${page}&limit=20${genre}`);
      return raw.map((r) => (r.movie || r.show ? { type: r.movie ? 'movie' : 'show', movie: r.movie, show: r.show } : { type, [type]: r }));
    }));
    const all = lists.flat();
    return kind === 'all' ? all : all.filter((i) => kindOf(i) === kind);
  }

  async search(query, kind) {
    const raw = await this.call(`/search/movie,show?query=${encodeURIComponent(query)}&${TraktApi.EXT}&limit=30`);
    return raw.filter((r) => r.movie || r.show)
      .map((r) => ({ type: r.movie ? 'movie' : 'show', movie: r.movie, show: r.show }))
      .filter((i) => kindOf(i) === kind);
  }

  // ---- home ----
  recent() { return this.memo('recent', () => this.call(`/sync/history?${TraktApi.EXT}&limit=40`)); }

  // The dates of the latest plays, for the streak.
  activity() { return this.memo('activity', async () => (await this.call('/sync/history?limit=1000')).map((r) => r.watched_at)); }

  async progress(show) {
    const p = await this.call(`/shows/${show.ids.trakt}/progress/watched`);
    return p.next_episode ? { next: p.next_episode, left: Math.max(0, (p.aired || 0) - (p.completed || 0)), aired: p.aired || 0, completed: p.completed || 0 } : null;
  }

  // Shows from the latest history that still have episodes left.
  async upNext(recent, max = 10) {
    const seen = new Map();
    for (const r of recent) if (r.type === 'episode' && r.show && !seen.has(r.show.ids.trakt)) seen.set(r.show.ids.trakt, r.show);
    const rows = await Promise.all([...seen.values()].slice(0, max).map(async (show) => {
      try { const p = await this.progress(show); return p && p.left > 0 ? { show, ...p } : null; } catch (e) { return null; }
    }));
    return rows.filter(Boolean);
  }

  calendar() {
    return this.memo('calendar', async () => {
      const day = new Date().toISOString().slice(0, 10);
      const x = TraktApi.EXT;
      const [shows, movies] = await Promise.all([
        this.call(`/calendars/my/shows/${day}/14?${x}`).catch(() => []),
        this.call(`/calendars/my/movies/${day}/30?${x}`).catch(() => []),
      ]);
      return { shows, movies };
    });
  }

  // ---- title details ----
  idOf(item) { return mediaOf(item).ids.trakt; }
  path(item) { return `/${item.type}s/${this.idOf(item)}`; }
  summary(item) { return this.memo('sum:' + this.path(item), () => this.call(`${this.path(item)}?${TraktApi.EXT}`), 600000); }
  stats(item) { return this.memo('stats:' + this.path(item), () => this.call(`${this.path(item)}/stats`), 600000); }
  people(item) { return this.memo('people:' + this.path(item), () => this.call(`${this.path(item)}/people?extended=images`), 600000); }
  studios(item) { return this.memo('studios:' + this.path(item), () => this.call(`${this.path(item)}/studios`), 600000); }
  popularLists(item) { return this.memo('lists:' + this.path(item), () => this.call(`${this.path(item)}/lists/popular?limit=8`), 600000); }
  comments(item, kind) { return this.memo(`cm:${kind}:${this.path(item)}`, () => this.call(`${this.path(item)}/comments/${kind}?limit=10`), 300000); }
  async related(item) {
    const raw = await this.memo('rel:' + this.path(item), () => this.call(`${this.path(item)}/related?${TraktApi.EXT}&limit=12`), 600000);
    return raw.map((m) => ({ type: item.type, [item.type]: m }));
  }

  // ---- episodes ----
  seasons(show) { return this.memo('seasons:' + show.ids.trakt, () => this.call(`/shows/${show.ids.trakt}/seasons?extended=full,episodes,images`), 600000); }
  showProgress(show) { return this.call(`/shows/${show.ids.trakt}/progress/watched`); }

  async setEpisode(show, episode, on, at) {
    const entry = { ids: { trakt: episode.ids.trakt }, ...(on && at ? { watched_at: at } : {}) };
    await this.call('/sync/history' + (on ? '' : '/remove'), 'POST', { episodes: [entry] });
    this.memos.delete('recent');
    this.memos.delete('activity');
    if (on) (await this.tracked({ type: 'show', show })).flags.watched = true;
  }

  async setSeason(show, season, on) {
    await this.call('/sync/history' + (on ? '' : '/remove'), 'POST', { seasons: [{ ids: { trakt: season.ids.trakt } }] });
    this.memos.delete('recent');
    this.memos.delete('activity');
    if (on) (await this.tracked({ type: 'show', show })).flags.watched = true;
  }

  // "Now watching": tells Trakt you are watching it right now.
  checkin(kind, media) { return this.call('/checkin', 'POST', { [kind]: { ids: { trakt: media.ids.trakt } } }); }

  episodePeople(show, ep) { return this.memo(`epeople:${show.ids.trakt}:${ep.season}:${ep.number}`, () => this.call(`/shows/${show.ids.trakt}/seasons/${ep.season}/episodes/${ep.number}/people`), 600000); }

  // ---- history ----
  history(page = 1, limit = 40) { return this.call(`/sync/history?${TraktApi.EXT}&page=${page}&limit=${limit}`); }

  async removeHistory(id) {
    await this.call('/sync/history/remove', 'POST', { ids: [id] });
    this.memos.delete('recent');
    this.memos.delete('activity');
  }
}
