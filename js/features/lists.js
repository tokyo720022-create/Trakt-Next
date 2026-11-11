/* lists.js: the Anime, TV Shows and Movies screens: status chips, search, filter, customise, custom lists. */
class ListScreen {
  static PAGE = 30;
  static freshFilter() { return { sort: 'UPDATED', genres: {}, yFrom: '', yTo: '', minRating: '', persist: false }; }

  constructor(app) {
    this.app = app;
    this.kind = 'anime';
    this.status = 'all';
    this.query = '';
    this.pages = 1;
    this.items = [];
    this.filter = app.store.get('filter') || ListScreen.freshFilter();
    this.layout = { ...Cards.DEFAULT_LAYOUT, ...(app.store.get('layout') || {}) };
    this.options = new ListOptions(app, this);
    $('lSearchBtn').onclick = () => {
      const box = $('listSearch');
      box.hidden = !box.hidden;
      if (box.hidden) { box.value = ''; this.query = ''; this.draw(); } else box.focus();
    };
    $('listSearch').oninput = (e) => { this.query = e.target.value.trim().toLowerCase(); this.pages = 1; this.draw(); };
    $('lFilterBtn').onclick = () => this.options.openFilter();
    $('lCustBtn').onclick = () => this.options.openCustomise();
    $('lListsBtn').onclick = () => app.customLists.open();
    $('listMore').onclick = () => { this.pages++; this.draw(); };
  }

  async open(kind) {
    this.kind = kind;
    this.status = 'all';
    this.pages = 1;
    this.query = '';
    $('listSearch').value = '';
    $('listTitle').textContent = KINDS[kind].label + ' List';
    await this.load();
  }

  async load(force = false) {
    const kind = this.kind;
    const note = $('listNote');
    note.hidden = false;
    note.textContent = 'Loading…';
    try {
      const lib = await this.app.trakt.library(force);
      if (kind !== this.kind) return;
      this.items = lib.filter((i) => kindOf(i) === kind);
      note.hidden = true;
    } catch (err) {
      this.items = [];
      note.textContent = 'Could not load your list: ' + err.message;
    }
    this.draw();
  }

  visible() {
    const f = this.filter;
    const inc = Object.keys(f.genres).filter((g) => f.genres[g] === 'inc');
    const exc = Object.keys(f.genres).filter((g) => f.genres[g] === 'exc');
    const list = this.items.filter((i) => {
      const m = mediaOf(i);
      const genres = m.genres || [];
      if (this.status !== 'all' && !i.flags[this.status]) return false;
      if (this.query && !(m.title || '').toLowerCase().includes(this.query)) return false;
      if (inc.some((g) => !genres.includes(g)) || exc.some((g) => genres.includes(g))) return false;
      if (f.yFrom && !(m.year >= +f.yFrom)) return false;
      if (f.yTo && !(m.year <= +f.yTo)) return false;
      if (f.minRating && !((m.rating || 0) >= +f.minRating)) return false;
      return true;
    });
    const title = (i) => mediaOf(i).title || '';
    const by = {
      UPDATED: (a, b) => (b.when || '').localeCompare(a.when || ''),
      TITLE: (a, b) => title(a).localeCompare(title(b)),
      RATING: (a, b) => b.rating - a.rating,
      AVG: (a, b) => (mediaOf(b).rating || 0) - (mediaOf(a).rating || 0),
      YEAR: (a, b) => (mediaOf(b).year || 0) - (mediaOf(a).year || 0),
      PLAYS: (a, b) => b.plays - a.plays,
    };
    return list.sort(by[f.sort] || by.UPDATED);
  }

  draw() {
    const row = $('listStatus');
    row.replaceChildren();
    for (const [id, label] of [['all', 'All'], ['watched', 'Watched'], ['watchlist', 'Watchlist'], ['rated', 'Rated']]) {
      const n = id === 'all' ? this.items.length : this.items.filter((i) => i.flags[id]).length;
      const chip = el('button', `${label} ${n}`, 'chip');
      chip.setAttribute('aria-pressed', String(this.status === id));
      chip.onclick = () => { this.status = id; this.pages = 1; this.draw(); };
      row.append(chip);
    }
    $('listCount').textContent = `All (${this.items.length})`;
    const list = this.visible();
    const body = $('listBody');
    body.className = 'lay-' + this.layout.type;
    body.style.setProperty('--cols', this.layout.cols);
    body.replaceChildren(...list.slice(0, this.pages * ListScreen.PAGE).map((i) => Cards.build(i, this.layout, (it) => this.app.itemSheet.open(it))));
    if (!list.length) body.append(el('p', 'Nothing here yet.', 'muted'));
    $('listMore').hidden = list.length <= this.pages * ListScreen.PAGE;
  }
}
