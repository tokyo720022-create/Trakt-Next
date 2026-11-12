/* history.js: your full watch history, grouped by day, with Media / Anime / Shows / Movies chips. */
class HistoryScreen {
  static PAGE = 40;

  constructor(app) {
    this.app = app;
    this.kind = 'all';
    this.items = [];
    this.page = 1;
    this.more = false;
    this.seq = 0;
    $('hsBack').onclick = () => { $('hsheet').hidden = true; };
    $('hsKinds').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { this.kind = b.dataset.k; this.paint(); this.draw(); } };
    $('hsMore').onclick = () => this.load();
  }

  paint() { document.querySelectorAll('#hsKinds .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === this.kind))); }

  open() {
    this.items = [];
    this.page = 1;
    this.paint();
    $('hsheet').hidden = false;
    $('hsList').replaceChildren(el('p', 'Loading…', 'muted'));
    $('hsMore').hidden = true;
    this.load();
  }

  async load() {
    const seq = ++this.seq;
    try {
      await this.app.trakt.library().catch(() => null); // so ratings can be shown
      const rows = await this.app.trakt.history(this.page, HistoryScreen.PAGE);
      if (seq !== this.seq) return;
      this.items.push(...rows);
      this.more = rows.length === HistoryScreen.PAGE;
      this.page++;
      this.draw();
    } catch (err) { if (seq === this.seq) $('hsList').replaceChildren(el('p', 'Could not load: ' + err.message, 'muted')); }
  }

  draw() {
    const rows = this.items.filter((r) => this.kind === 'all' || kindOf(r) === this.kind);
    const list = $('hsList');
    list.replaceChildren();
    let day = '';
    for (const r of rows) {
      const label = dayLabel(r.watched_at);
      if (label !== day) { day = label; list.append(el('h3', label, 'sec')); }
      list.append(this.row(r));
    }
    if (!rows.length) list.append(el('p', 'Nothing here yet.', 'muted'));
    $('hsMore').hidden = !this.more;
  }

  row(r) {
    const m = mediaOf(r);
    const open = () => this.app.detail.open(r.type === 'movie' ? { type: 'movie', movie: r.movie } : { type: 'show', show: r.show });
    const row = el('div', undefined, 'hr');
    const img = el('div', undefined, 'pimg');
    setImage(img, posterOf(m), (m.title || '?').charAt(0));
    img.onclick = open;
    const body = el('div', undefined, 'hbody');
    const top = el('div', undefined, 'htop');
    const title = el('div', undefined);
    title.append(el('div', m.title || 'Unknown', 't'), el('div', r.type === 'episode' ? `S${r.episode.season} • E${r.episode.number} - ${r.episode.title || ''}` : 'Movie', 'm'));
    title.onclick = open;
    const menu = el('button', '⋮', 'ic');
    menu.setAttribute('aria-label', 'More');
    top.append(title, menu);
    const stars = this.app.trakt.ratingOf(r);
    const foot = el('div', undefined, 'hfoot');
    foot.append(el('span', '📅 ' + new Date(r.watched_at).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }), 'm'));
    if (stars) foot.append(el('span', '★ ' + stars5(stars), 'star'));
    const remove = el('button', 'Remove from history', 'go alt');
    remove.hidden = true;
    remove.onclick = async () => {
      remove.disabled = true;
      try { await this.app.trakt.removeHistory(r.id); this.items = this.items.filter((x) => x !== r); this.draw(); }
      catch (err) { remove.disabled = false; remove.textContent = 'Could not remove: ' + err.message; }
    };
    menu.onclick = () => { remove.hidden = !remove.hidden; };
    body.append(top, foot, remove);
    row.append(img, body);
    return row;
  }
}
