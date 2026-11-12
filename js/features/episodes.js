/* episodes.js: seasons and episodes of a show, with a watched tick on every episode. */
class EpisodeList {
  // The first aired episode (specials excluded) that is not watched yet.
  static nextUnwatched(seasons, watched, now = new Date()) {
    for (const s of seasons.filter((x) => x.number > 0).sort((a, b) => a.number - b.number)) {
      for (const e of s.episodes || []) {
        if (!watched.has(s.number + ':' + e.number) && (!e.first_aired || new Date(e.first_aired) <= now)) return e;
      }
    }
    return null;
  }

  constructor(app, screen) {
    this.app = app;
    this.screen = screen;
    this.show = null;
    this.seasons = [];
    this.watched = new Set();
    this.season = 1;
    this.ready = false;
  }

  reset() { this.show = null; this.seasons = []; this.watched = new Set(); this.ready = false; }

  next() { return EpisodeList.nextUnwatched(this.seasons, this.watched); }

  // Called when an episode was changed somewhere else (the episode screen).
  apply(showId, key, on) {
    if (!this.show || this.show.ids.trakt !== showId) return;
    if (on) this.watched.add(key); else this.watched.delete(key);
    this.draw();
    this.screen.drawBar();
  }

  async load(item, seq) {
    if (item.type !== 'show') return;
    this.show = item.show;
    this.seasons = [];
    this.watched = new Set();
    $('dtSeasons').replaceChildren();
    $('dtEpisodes').replaceChildren(el('p', 'Loading…', 'muted'));
    try {
      const t = this.app.trakt;
      const [seasons, progress] = await Promise.all([t.seasons(this.show), t.showProgress(this.show).catch(() => null)]);
      if (seq !== this.screen.seq) return;
      this.seasons = seasons;
      for (const s of (progress && progress.seasons) || []) for (const e of s.episodes || []) if (e.completed) this.watched.add(s.number + ':' + e.number);
      const next = this.next();
      const last = seasons.filter((s) => s.number > 0).pop() || seasons[0];
      this.season = next ? next.season : last ? last.number : 1;
      this.ready = true;
      this.draw();
      this.screen.drawBar();
    } catch (err) { if (seq === this.screen.seq) $('dtEpisodes').replaceChildren(el('p', 'Could not load episodes: ' + err.message, 'muted')); }
  }

  draw() {
    const chips = $('dtSeasons');
    chips.replaceChildren();
    for (const s of this.seasons) {
      const chip = el('button', s.number === 0 ? 'Specials' : 'Season ' + s.number, 'chip');
      chip.setAttribute('aria-pressed', String(s.number === this.season));
      chip.onclick = () => { this.season = s.number; this.draw(); };
      chips.append(chip);
    }
    const season = this.seasons.find((s) => s.number === this.season);
    const box = $('dtEpisodes');
    box.replaceChildren();
    if (!season) { box.append(el('p', 'No episodes listed.', 'muted')); return; }
    const eps = season.episodes || [];
    const all = eps.length > 0 && eps.every((e) => this.watched.has(season.number + ':' + e.number));
    const bulk = el('button', all ? 'Unmark season' : 'Mark season watched', 'go alt');
    bulk.onclick = () => this.setSeason(season, !all);
    box.append(bulk);
    for (const e of eps) {
      const on = this.watched.has(e.season + ':' + e.number);
      const row = el('div', undefined, 'ep');
      const thumb = el('div', undefined, 'epthumb');
      setImage(thumb, imageUrl(e.images && (e.images.screenshot || e.images.thumb)), '');
      const text = el('div');
      text.style.flex = '1';
      text.append(el('div', `E${e.number} · ${e.title || 'Episode ' + e.number}`, 't'), el('div', fmtDate(e.first_aired), 'm'));
      const open = () => this.app.episodeScreen.open(this.show, e);
      thumb.onclick = open;
      text.onclick = open;
      const tick = el('button', '✓', 'tick' + (on ? ' on' : ''));
      tick.setAttribute('aria-label', on ? 'Mark as not watched' : 'Mark as watched');
      tick.onclick = () => this.toggle(e);
      row.append(thumb, text, tick);
      box.append(row);
    }
  }

  async toggle(episode, on, at, rethrow = false) {
    const key = episode.season + ':' + episode.number;
    const want = on === undefined ? !this.watched.has(key) : on;
    await this.save(() => this.app.trakt.setEpisode(this.show, episode, want, at), () => { if (want) this.watched.add(key); else this.watched.delete(key); }, rethrow);
  }

  async setSeason(season, on) {
    await this.save(() => this.app.trakt.setSeason(this.show, season, on), () => {
      for (const e of season.episodes || []) { const k = season.number + ':' + e.number; if (on) this.watched.add(k); else this.watched.delete(k); }
    });
  }

  async save(send, apply, rethrow = false) {
    $('dtMsg').textContent = 'Saving…';
    try {
      await send();
      apply();
      this.draw();
      this.screen.cur = (await this.app.trakt.find(this.screen.item)) || this.screen.cur;
      this.screen.drawBar();
      $('dtMsg').textContent = 'Saved to Trakt';
      this.app.lists.draw();
    } catch (err) { $('dtMsg').textContent = 'Could not save: ' + err.message; if (rethrow) throw err; }
  }
}
