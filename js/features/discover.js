/* discover.js: Trending, Popular, Anticipated and For you from Trakt, and search. */
class DiscoverScreen {
  static TITLES = { trending: 'Trending', popular: 'Popular', anticipated: 'Anticipated', foryou: 'Recommended for you' };

  constructor(app) {
    this.app = app;
    this.kind = 'anime';
    this.mode = 'trending';
    this.query = '';
    this.page = 1;
    this.seq = 0;
    this.timer = 0;
    $('dKinds').onclick = (e) => { const b = e.target.closest('.chip'); if (b) { this.kind = b.dataset.k; this.reload(); } };
    $('dTiles').onclick = (e) => {
      const b = e.target.closest('.dtile');
      if (b) { this.mode = b.dataset.mode; this.query = ''; $('dq').value = ''; this.reload(); }
    };
    $('dq').oninput = (e) => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.query = e.target.value.trim(); this.reload(); }, 400);
    };
    $('dmore').onclick = () => this.load();
  }

  open() { this.reload(); }

  reload() {
    this.page = 1;
    document.querySelectorAll('#dKinds .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === this.kind)));
    document.querySelectorAll('#dTiles .dtile').forEach((b) => b.setAttribute('aria-pressed', String(!this.query && b.dataset.mode === this.mode)));
    $('dTitle').textContent = this.query ? `Results for “${this.query}”` : `${DiscoverScreen.TITLES[this.mode]} · ${KINDS[this.kind].label}`;
    const layout = this.app.lists.layout;
    const list = $('dlist');
    list.className = 'lay-' + layout.type;
    list.style.setProperty('--cols', layout.cols);
    list.replaceChildren(el('p', 'Loading…', 'muted'));
    this.load(true);
  }

  async load(first = false) {
    const seq = ++this.seq;
    const list = $('dlist');
    try {
      const items = this.query ? await this.app.trakt.search(this.query, this.kind) : await this.app.trakt.discover(this.mode, this.kind, this.page);
      if (seq !== this.seq) return;
      if (first) list.replaceChildren();
      items.forEach((i) => list.append(Cards.build(i, this.app.lists.layout, (it) => this.app.itemSheet.open(it))));
      if (first && !items.length) list.append(el('p', 'Nothing found.', 'muted'));
      $('dmore').hidden = Boolean(this.query) || !items.length;
      this.page++;
    } catch (err) {
      if (seq === this.seq) list.replaceChildren(el('p', 'Could not load: ' + err.message, 'muted'));
    }
  }
}
