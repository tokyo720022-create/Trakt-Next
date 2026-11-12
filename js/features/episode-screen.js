/* episode-screen.js: one episode: thumbnail, title, director, rating, the check button, overview, previous / next. */
class EpisodeScreen {
  constructor(app) {
    this.app = app;
    this.show = null;
    this.ep = null;
    this.flat = [];
    this.watched = new Set();
    this.director = '';
    this.seq = 0;
    $('esBack').onclick = () => { $('esheet').hidden = true; };
    $('esPrev').onclick = () => this.step(-1);
    $('esNext').onclick = () => this.step(1);
  }

  key(e) { return e.season + ':' + e.number; }

  open(show, episode) {
    this.show = show;
    $('esheet').hidden = false;
    this.load(episode);
  }

  async load(episode) {
    const seq = ++this.seq;
    this.ep = episode;
    this.director = '';
    $('esMsg').textContent = '';
    $('esheet').scrollTop = 0;
    this.paint();
    const t = this.app.trakt;
    const [seasons, progress, people] = await Promise.all([
      t.seasons(this.show).catch(() => []), t.showProgress(this.show).catch(() => null), t.episodePeople(this.show, episode).catch(() => null),
    ]);
    if (seq !== this.seq) return;
    this.flat = seasons.flatMap((s) => s.episodes || []).sort((a, b) => a.season - b.season || a.number - b.number);
    this.watched = new Set();
    for (const s of (progress && progress.seasons) || []) for (const e of s.episodes || []) if (e.completed) this.watched.add(s.number + ':' + e.number);
    const d = ((people && people.crew && people.crew.directing) || [])[0];
    this.director = d ? d.person.name : '';
    this.paint();
  }

  step(by) {
    const i = this.flat.findIndex((e) => this.key(e) === this.key(this.ep));
    const target = this.flat[i + by];
    if (target) this.load(target);
  }

  paint() {
    const e = this.ep;
    const s = this.show;
    const i = this.flat.findIndex((x) => this.key(x) === this.key(e));
    $('esHead').textContent = s.title || '';
    const hero = $('esHero');
    hero.replaceChildren();
    setImage(hero, imageUrl(e.images && (e.images.screenshot || e.images.thumb)) || thumbOf(s), '');
    $('esKick').textContent = `${(s.title || '').toUpperCase()} / S${e.season} • E${e.number}`;
    $('esTitle').textContent = e.title || `Episode ${e.number}`;
    $('esDirector').textContent = this.director ? 'Directed by ' + this.director : '';
    const year = e.first_aired ? new Date(e.first_aired).getFullYear() : '';
    $('esMeta').textContent = [year, fmtRuntime(e.runtime || s.runtime), s.certification, (s.genres || []).slice(0, 2).map(cap).join(', ')].filter(Boolean).join(' • ');
    $('esRate').textContent = e.rating ? `★ ${Math.round(e.rating * 10)}%` : '';
    $('esOverview').textContent = e.overview || '';
    $('esPrev').disabled = i <= 0;
    $('esNext').disabled = i < 0 || i >= this.flat.length - 1;
    this.drawBar();
  }

  drawBar() {
    const e = this.ep;
    const bar = $('esBar');
    bar.replaceChildren();
    const on = this.watched.has(this.key(e));
    const main = el('button', on ? '✓ Watched' : '✓', 'main' + (on ? '' : ' outline'));
    main.setAttribute('aria-label', on ? 'Watched. Tap to remove' : 'Mark as watched');
    main.onclick = () => (on ? this.change(false).catch(() => {}) : this.app.mark.open({
      title: this.show.title, sub: e.title, release: e.first_aired,
      checkin: () => this.app.trakt.checkin('episode', e),
      onPick: (at) => this.change(true, at),
    }));
    const more = el('button', '⋯', 'ic');
    more.setAttribute('aria-label', 'Go to the show');
    more.onclick = () => this.app.detail.open({ type: 'show', show: this.show });
    bar.append(main, more);
  }

  async change(on, at) {
    const e = this.ep;
    $('esMsg').textContent = 'Saving…';
    try {
      await this.app.trakt.setEpisode(this.show, e, on, at);
      if (on) this.watched.add(this.key(e)); else this.watched.delete(this.key(e));
      this.app.detail.episodes.apply(this.show.ids.trakt, this.key(e), on);
      this.drawBar();
      $('esMsg').textContent = on ? 'Saved to Trakt' : 'Removed from your history';
    } catch (err) { $('esMsg').textContent = 'Could not save: ' + err.message; throw err; }
  }
}
