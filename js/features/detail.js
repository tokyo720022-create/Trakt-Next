/* detail.js: the title screen: hero, action bar, stars, overview. Related titles open on top of each other. */
class DetailScreen {
  constructor(app) {
    this.app = app;
    this.stack = [];
    this.item = null;
    this.m = {};
    this.cur = { flags: {}, rating: 0 };
    this.director = '';
    this.pills = [];
    this.fav = false;
    this.seq = 0;
    this.extras = new DetailExtras(app, this);
    this.episodes = new EpisodeList(app, this);
    $('dtBack').onclick = () => this.back();
    $('dtShare').onclick = () => this.share();
    $('dtAddList').onclick = () => {
      const id = $('dtList').value;
      if (id) this.run(() => app.trakt.addToList(id, this.item), 'Added to your list');
    };
  }

  open(item) {
    const type = item.type === 'movie' ? 'movie' : 'show'; // an episode opens as its show
    const title = { type, [type]: mediaOf(item) };
    this.stack.push(title);
    $('dsheet').hidden = false;
    this.show(title);
  }

  back() {
    this.stack.pop();
    if (this.stack.length) this.show(this.stack[this.stack.length - 1]); else $('dsheet').hidden = true;
  }

  async show(item) {
    const seq = ++this.seq;
    this.item = item;
    this.m = mediaOf(item);
    this.director = '';
    this.pills = [];
    this.fav = false;
    this.cur = { flags: {}, rating: 0 };
    this.episodes.reset();
    $('dsheet').scrollTop = 0;
    $('dtMsg').textContent = '';
    $('dtMore').hidden = true;
    for (const id of ['dtCast', 'dtReviews', 'dtRelated', 'dtLists', 'dtDetails']) $(id).replaceChildren(el('p', 'Loading…', 'muted'));
    $('dtShowBox').hidden = item.type !== 'show';
    this.paint();
    try { this.cur = (await this.app.trakt.find(item)) || this.cur; } catch (e) { /* keep the empty state */ }
    if (seq !== this.seq) return;
    this.paint();
    this.fillLists();
    this.episodes.load(item, seq);
    this.app.trakt.ratings(item).then((r) => { if (seq === this.seq) { this.pills = ratingPills(r); this.paint(); } }).catch(() => {});
    this.app.trakt.favorites().then((set) => { if (seq === this.seq) { this.fav = set.has(this.favKey()); this.drawStars(); } }).catch(() => {});
    this.app.trakt.summary(item).catch(() => null).then((full) => {
      if (seq !== this.seq) return;
      if (full) { this.m = { ...this.m, ...full }; this.item = { type: item.type, [item.type]: this.m }; this.paint(); }
      this.extras.load(this.item, seq);
    });
  }

  favKey() { return this.item.type + ':' + this.m.ids.trakt; }

  subline() { return this.item.type === 'show' ? this.m.network || '' : this.director ? 'Directed by ' + this.director : ''; }

  setDirector(name) { this.director = name; if (this.subEl) this.subEl.textContent = this.subline(); }

  paint() {
    const m = this.m;
    $('dtHead').textContent = m.title || '';
    const hero = $('dtHero');
    hero.replaceChildren();
    const poster = el('div', undefined, 'dposter');
    setImage(poster, posterOf(m, 'medium'), (m.title || '?').charAt(0));
    if (this.cur.flags.watched) poster.append(el('span', '✓ WATCHED', 'dwatched'));
    this.subEl = el('div', this.subline(), 'sub');
    const meta = [m.year, fmtRuntime(m.runtime), m.certification, (m.genres || []).slice(0, 2).map(cap).join(', ')].filter(Boolean).join(' • ');
    hero.append(poster, el('h2', m.title || 'Unknown'), this.subEl, el('div', meta, 'sub'));
    if (m.status) hero.append(el('div', m.status.toUpperCase(), 'dstatus'));
    const pills = this.pills.length ? this.pills : m.rating ? ['★ ' + Math.round(m.rating * 10) + '%'] : [];
    if (pills.length) hero.append(el('div', pills.join('   '), 'drate'));
    $('dtOverview').textContent = m.overview || m.tagline || '';
    this.drawBar();
    this.drawStars();
  }

  drawBar() {
    const bar = $('dtBar');
    bar.replaceChildren();
    const main = el('button', undefined, 'main');
    if (this.item.type === 'movie') {
      main.textContent = this.cur.flags.watched ? '✓ Watched' : '✓ Mark as watched';
      main.onclick = () => {
        if (this.cur.flags.watched) { this.run(() => this.app.trakt.setWatched(this.item, false)); return; }
        this.app.mark.open({
          title: this.m.title, sub: 'Movie', release: this.m.released,
          checkin: () => this.app.trakt.checkin('movie', this.m),
          onPick: (at) => this.run(() => this.app.trakt.setWatched(this.item, true, at), undefined, true),
        });
      };
    } else {
      const next = this.episodes.next();
      main.textContent = !this.episodes.ready ? '…' : next ? `✓ S${next.season}E${next.number}` : 'Caught up';
      main.disabled = !next;
      main.onclick = () => next && this.app.mark.open({
        title: this.m.title, sub: `S${next.season} • E${next.number} - ${next.title || ''}`, release: next.first_aired,
        checkin: () => this.app.trakt.checkin('episode', next),
        onPick: (at) => this.episodes.toggle(next, true, at, true),
      });
    }
    const icon = (text, label, onClick, on = false) => {
      const b = el('button', text, 'ic' + (on ? ' on' : ''));
      b.setAttribute('aria-label', label);
      b.onclick = onClick;
      return b;
    };
    const trailer = icon('▶', 'Trailer', () => this.m.trailer && openLink(this.m.trailer));
    trailer.disabled = !this.m.trailer;
    bar.append(
      main,
      icon('🔖', this.cur.flags.watchlist ? 'Remove from watchlist' : 'Add to watchlist', () => this.run(() => this.app.trakt.setWatchlist(this.item, !this.cur.flags.watchlist)), this.cur.flags.watchlist),
      trailer,
      icon('⋯', 'More', () => { $('dtMore').hidden = !$('dtMore').hidden; }),
    );
  }

  // Five stars, each worth 2 points; tap the left half of a star for a half point. Tapping the same rating again clears it.
  drawStars() {
    const box = $('dtStars');
    box.replaceChildren();
    const r = this.cur.rating || 0;
    for (let i = 1; i <= 5; i++) {
      const star = el('span', '★', 'st' + (r >= i * 2 ? ' on' : r === i * 2 - 1 ? ' half' : ''));
      star.onclick = (e) => {
        const value = i * 2 - (e.offsetX < star.clientWidth / 2 ? 1 : 0);
        this.run(() => this.app.trakt.rate(this.item, value === r ? 0 : value));
      };
      box.append(star);
    }
    if (r) box.append(el('span', stars5(r), 'sub'));
    const heart = el('span', this.fav ? '♥' : '♡', 'st heart' + (this.fav ? ' on' : ''));
    heart.setAttribute('aria-label', this.fav ? 'Remove from favorites' : 'Add to favorites');
    heart.onclick = () => this.run(async () => { await this.app.trakt.setFavorite(this.item, !this.fav); this.fav = !this.fav; }, this.fav ? 'Removed from favorites' : 'Added to favorites');
    box.append(heart);
  }

  async fillLists() {
    const select = $('dtList');
    select.replaceChildren();
    try {
      const lists = await this.app.trakt.customLists();
      lists.forEach((l) => select.append(new Option(l.name, l.ids.trakt)));
      if (!lists.length) select.append(new Option('No custom lists yet', ''));
    } catch (e) { select.append(new Option('Could not load lists', '')); }
  }

  // rethrow: let the caller (the Mark as watched sheet) know when saving failed.
  async run(change, done = 'Saved to Trakt', rethrow = false) {
    $('dtMsg').textContent = 'Saving…';
    try {
      await change();
      this.cur = (await this.app.trakt.find(this.item)) || this.cur;
      this.paint();
      $('dtMsg').textContent = done;
      this.app.lists.draw();
    } catch (err) { $('dtMsg').textContent = 'Could not save: ' + err.message; if (rethrow) throw err; }
  }

  async share() {
    const url = `https://trakt.tv/${this.item.type}s/${this.m.ids.slug || this.m.ids.trakt}`;
    try { if (navigator.share) { await navigator.share({ title: this.m.title, url }); return; } } catch (e) { /* cancelled */ }
    openLink(url);
  }
}
