/* home.js: the Home screen: Continue Watching, Start Watching, streak, Calendar, Recommended, History. */
class HomeScreen {
  constructor(app) {
    this.app = app;
    this.kind = 'all';
    this.calChip = 'all';
    this.seq = 0;
    this.recent = [];
    this.lib = [];
    this.up = [];
    this.rec = [];
    this.calendarData = { shows: [], movies: [] };
    this.dates = [];
    $('hKinds').onclick = (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      this.kind = b.dataset.k;
      this.paint();
      this.drawAll();
      this.loadRecommended();
    };
    $('hCalKinds').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { this.calChip = b.dataset.k; this.paint(); this.drawCalendar(); } };
    $('hStreak').onclick = () => app.streak.open(this.dates);
    $('hHistLink').onclick = () => app.history.open();
    $('hContLink').onclick = () => app.watching.open();
  }

  paint() {
    document.querySelectorAll('#hKinds .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === this.kind)));
    document.querySelectorAll('#hCalKinds .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === this.calChip)));
  }

  open() {
    const seq = ++this.seq;
    const t = this.app.trakt;
    this.paint();
    ['hContinue', 'hStart', 'hCal', 'hRec', 'hHist'].forEach((id) => $(id).replaceChildren(el('p', 'Loading…', 'muted')));
    const guard = (id, promise, then) => promise
      .then((v) => { if (seq === this.seq) then(v); })
      .catch((e) => { if (seq === this.seq) $(id).replaceChildren(el('p', 'Could not load: ' + e.message, 'muted')); });
    guard('hHist', t.recent(), (v) => {
      this.recent = v;
      this.drawHistory();
      guard('hContinue', t.upNext(v), (rows) => { this.up = rows; this.drawContinue(); });
    });
    guard('hStart', t.library(), (v) => { this.lib = v; this.drawStart(); this.drawHistory(); });
    guard('hCal', t.calendar(), (v) => { this.calendarData = v; this.drawCalendar(); });
    t.activity().then((v) => { if (seq === this.seq) { this.dates = v; this.paintStreak(); } }).catch(() => { $('hStreakN').textContent = 'Streak'; });
    this.loadRecommended();
  }

  loadRecommended() {
    const kind = this.kind;
    const seq = this.seq;
    this.app.trakt.discover('foryou', kind).then((v) => { if (seq === this.seq && kind === this.kind) { this.rec = v; this.drawRec(); } })
      .catch((e) => { if (seq === this.seq) $('hRec').replaceChildren(el('p', 'Could not load: ' + e.message, 'muted')); });
  }

  drawAll() { this.drawContinue(); this.drawStart(); this.drawCalendar(); this.drawHistory(); }

  inKind(item) { return this.kind === 'all' || kindOf(item) === this.kind; }

  fill(id, nodes, empty) { $(id).replaceChildren(...(nodes.length ? nodes : [el('p', empty, 'muted')])); }

  card({ thumb, title, sub, badge, onTap, action }) {
    const c = el('div', undefined, 'hc');
    const th = el('div', undefined, 'thumb');
    setImage(th, thumb, title.charAt(0));
    if (badge) th.append(el('span', badge, 'badge'));
    const info = el('div', undefined, 'hinfo');
    const text = el('div');
    text.append(el('div', title, 't'), el('div', sub, 'm'));
    info.append(text);
    if (action) info.append(action);
    th.onclick = onTap;
    text.onclick = onTap;
    c.append(th, info);
    return c;
  }

  asTitle(item) { return item.type === 'movie' ? { type: 'movie', movie: item.movie } : { type: 'show', show: item.show }; }

  episodeLine(e) { return `S${e.season} • E${e.number}${e.title ? ' - ' + e.title : ''}`; }

  paintStreak() {
    const s = Streak.compute(this.dates);
    $('hStreakN').textContent = `${s.current}-day streak`;
    $('hDots').replaceChildren(...s.last7.map((on, i) => el('i', undefined, (on ? 'on' : '') + (i === 6 ? ' today' : ''))));
  }

  drawContinue() {
    const rows = this.up.filter((r) => this.inKind({ type: 'show', show: r.show }));
    this.fill('hContinue', rows.map((r) => {
      const tick = el('button', '✓', 'tick');
      tick.setAttribute('aria-label', 'Mark the next episode as watched');
      tick.onclick = () => this.watchNext(r, tick);
      return this.card({ thumb: thumbOf(r.show), title: r.show.title, sub: this.episodeLine(r.next), badge: `${r.left} left`, onTap: () => this.app.detail.open({ type: 'show', show: r.show }), action: tick });
    }), 'Nothing in progress.');
  }

  async watchNext(row, tick) {
    tick.disabled = true;
    try {
      await this.app.trakt.markEpisode(row.next);
      this.dates.push(new Date().toISOString());
      this.paintStreak();
      const fresh = await this.app.trakt.progress(row.show);
      if (fresh && fresh.left > 0) Object.assign(row, fresh); else this.up = this.up.filter((r) => r !== row);
      this.drawContinue();
    } catch (err) { tick.disabled = false; tick.textContent = '!'; }
  }

  drawStart() {
    const rows = this.lib.filter((i) => i.flags.watchlist && !i.flags.watched && this.inKind(i))
      .sort((a, b) => (b.when || '').localeCompare(a.when || '')).slice(0, 20);
    this.fill('hStart', rows.map((i) => this.card({ thumb: thumbOf(mediaOf(i)), title: mediaOf(i).title, sub: String(mediaOf(i).year || ''), onTap: () => this.app.detail.open(i) })),
      'Your watchlist is empty. Add titles from Discover.');
  }

  drawCalendar() {
    const d = this.calendarData;
    const open = (item) => () => this.app.detail.open(item);
    let nodes;
    if (this.kind === 'movies') {
      nodes = d.movies.map((m) => this.card({ thumb: thumbOf(m.movie), title: m.movie.title, sub: 'Movie', badge: this.shortDate(m.released), onTap: open({ type: 'movie', movie: m.movie }) }));
    } else {
      const isPremiere = (e) => String(e.episode_type || '').includes('premiere') || e.number === 1;
      const isFinale = (e) => String(e.episode_type || '').includes('finale');
      nodes = d.shows
        .filter((r) => this.kind === 'all' || kindOf({ type: 'show', show: r.show }) === this.kind)
        .filter((r) => this.calChip === 'all' || (this.calChip === 'premiere' ? isPremiere(r.episode) : isFinale(r.episode)))
        .map((r) => this.card({
          thumb: thumbOf(r.show), title: r.show.title, sub: this.episodeLine(r.episode),
          badge: isPremiere(r.episode) ? 'Premiere' : isFinale(r.episode) ? 'Finale' : this.shortDate(r.first_aired),
          onTap: open({ type: 'show', show: r.show }),
        }));
    }
    this.fill('hCal', nodes, 'Nothing airing soon.');
  }

  shortDate(iso) { return iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : ''; }

  drawRec() {
    this.fill('hRec', this.rec.slice(0, 20).map((i) => this.card({ thumb: thumbOf(mediaOf(i)), title: mediaOf(i).title, sub: String(mediaOf(i).year || ''), onTap: () => this.app.detail.open(i) })), 'No recommendations yet.');
  }

  drawHistory() {
    const rows = this.recent.filter((r) => this.inKind(r)).slice(0, 20);
    this.fill('hHist', rows.map((r) => {
      const media = mediaOf(r);
      const stars = this.app.trakt.ratingOf(r);
      return this.card({
        thumb: thumbOf(media), title: media.title, sub: r.type === 'episode' ? this.episodeLine(r.episode) : 'Movie',
        badge: dayLabel(r.watched_at), onTap: () => this.app.detail.open(this.asTitle(r)),
        action: stars ? el('span', '★ ' + stars5(stars), 'star') : null,
      });
    }), 'No history yet.');
  }
}
