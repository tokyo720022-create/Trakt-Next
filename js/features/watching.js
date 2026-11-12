/* watching.js: Continue Watching as a full list: poster, next episode, time left, tick to mark the next episode. */
class WatchingScreen {
  constructor(app) {
    this.app = app;
    this.kind = 'all';
    this.rows = [];
    this.seq = 0;
    $('wsBack').onclick = () => { $('wsheet').hidden = true; };
    $('wsKinds').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { this.kind = b.dataset.k; this.paint(); this.draw(); } };
    $('wsSort').onchange = () => this.draw();
  }

  paint() { document.querySelectorAll('#wsKinds .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === this.kind))); }

  async open() {
    const seq = ++this.seq;
    this.paint();
    $('wsheet').hidden = false;
    $('wsList').replaceChildren(el('p', 'Loading…', 'muted'));
    try {
      const rows = await this.app.trakt.upNext(await this.app.trakt.recent(), 25);
      if (seq !== this.seq) return;
      this.rows = rows;
      this.draw();
    } catch (err) { if (seq === this.seq) $('wsList').replaceChildren(el('p', 'Could not load: ' + err.message, 'muted')); }
  }

  sorted() {
    const rows = this.rows.filter((r) => this.kind === 'all' || kindOf({ type: 'show', show: r.show }) === this.kind);
    const by = { MOST: (a, b) => b.left - a.left, LEAST: (a, b) => a.left - b.left, TITLE: (a, b) => a.show.title.localeCompare(b.show.title) };
    const sort = by[$('wsSort').value];
    return sort ? rows.sort(sort) : rows;
  }

  draw() {
    const list = $('wsList');
    list.replaceChildren();
    const rows = this.sorted();
    for (const r of rows) list.append(this.row(r));
    if (!rows.length) list.append(el('p', 'Nothing in progress.', 'muted'));
  }

  row(r) {
    const n = r.next;
    const open = () => this.app.episodeScreen.open(r.show, n);
    const row = el('div', undefined, 'hr');
    const img = el('div', undefined, 'pimg');
    setImage(img, posterOf(r.show), r.show.title.charAt(0));
    img.onclick = () => this.app.detail.open({ type: 'show', show: r.show });
    const body = el('div', undefined, 'hbody');
    const top = el('div', undefined, 'htop');
    const text = el('div');
    text.append(el('div', r.show.title, 't'), el('div', `S${n.season} • E${n.number}${n.title ? ' - ' + n.title : ''}`, 'm'));
    if (n.number === 1) text.append(el('span', 'Premiere', 'wbadge'));
    text.onclick = open;
    const menu = el('button', '⋮', 'ic');
    menu.setAttribute('aria-label', 'More');
    top.append(text, menu);
    const runtime = r.show.runtime || 0;
    const pct = r.aired ? Math.round((r.completed / r.aired) * 100) : 0;
    const pill = el('div', undefined, 'wpill');
    pill.style.background = `linear-gradient(90deg, #000 ${pct}%, rgba(255,255,255,.14) ${pct}%)`;
    pill.append(el('span', fmtRuntime(runtime)), el('span', `${r.left} left${runtime ? ' • ' + fmtSpan(r.left * runtime) : ''}`));
    const tick = el('button', '✓', 'tick');
    tick.setAttribute('aria-label', 'Mark the next episode as watched');
    tick.onclick = () => this.advance(r, tick);
    const foot = el('div', undefined, 'hfoot');
    foot.append(pill, tick);
    const goShow = el('button', 'Open show', 'go alt');
    goShow.hidden = true;
    goShow.onclick = () => this.app.detail.open({ type: 'show', show: r.show });
    menu.onclick = () => { goShow.hidden = !goShow.hidden; };
    body.append(top, foot, goShow);
    row.append(img, body);
    return row;
  }

  async advance(row, tick) {
    tick.disabled = true;
    try {
      const fresh = await this.app.trakt.advance(row);
      if (!fresh) this.rows = this.rows.filter((r) => r !== row);
      this.draw();
      this.app.toast('Saved to Trakt');
    } catch (err) { tick.disabled = false; this.app.toast('Could not save: ' + err.message); }
  }
}
