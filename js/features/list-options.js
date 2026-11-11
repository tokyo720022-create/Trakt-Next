/* list-options.js: the Filter sheet and the Customise sheet of the list screens. */
class ListOptions {
  constructor(app, screen) {
    this.app = app;
    this.screen = screen;
    this.draft = {};
    $('fsBack').onclick = () => { $('fsheet').hidden = true; };
    $('fsApply').onclick = () => this.applyFilter();
    $('fsReset').onclick = () => { screen.filter = ListScreen.freshFilter(); this.saveFilter(); this.fillFilter(); screen.draw(); };
    $('csBack').onclick = () => { $('csheet').hidden = true; };
    $('csLayout').onclick = (e) => { const b = e.target.closest('.chip'); if (b) this.setLayout({ type: b.dataset.v }); };
    $('csCols').onclick = (e) => { const b = e.target.closest('.chip'); if (b) this.setLayout({ cols: +b.dataset.v }); };
    $('csHideRating').onchange = (e) => this.setLayout({ hideRating: e.target.checked });
    $('csHideYear').onchange = (e) => this.setLayout({ hideYear: e.target.checked });
    $('csReset').onclick = () => this.setLayout({ ...Cards.DEFAULT_LAYOUT });
  }

  // ---- Filter ----
  openFilter() { this.fillFilter(); $('fsheet').hidden = false; }

  fillFilter() {
    const f = this.screen.filter;
    $('fsSort').value = f.sort;
    $('fsYFrom').value = f.yFrom;
    $('fsYTo').value = f.yTo;
    $('fsRating').value = f.minRating;
    $('fsPersist').checked = f.persist;
    this.draft = { ...f.genres };
    const box = $('fsGenres');
    box.replaceChildren();
    const genres = [...new Set(this.screen.items.flatMap((i) => mediaOf(i).genres || []))].sort();
    for (const g of genres) {
      const chip = el('button', g, 'chip');
      const paint = () => { chip.className = 'chip' + (this.draft[g] ? ' ' + this.draft[g] : ''); };
      chip.onclick = () => {
        const next = { undefined: 'inc', inc: 'exc', exc: undefined }[this.draft[g]];
        if (next) this.draft[g] = next; else delete this.draft[g];
        paint();
      };
      paint();
      box.append(chip);
    }
    if (!genres.length) box.append(el('span', 'No genres in this list yet.', 'muted'));
  }

  applyFilter() {
    this.screen.filter = {
      sort: $('fsSort').value, genres: this.draft, yFrom: $('fsYFrom').value.trim(), yTo: $('fsYTo').value.trim(),
      minRating: $('fsRating').value.trim(), persist: $('fsPersist').checked,
    };
    this.saveFilter();
    this.screen.pages = 1;
    $('fsheet').hidden = true;
    this.screen.draw();
  }

  saveFilter() {
    if (this.screen.filter.persist) this.app.store.set('filter', this.screen.filter); else this.app.store.remove('filter');
  }

  // ---- Customise ----
  openCustomise() { this.paintLayout(); $('csheet').hidden = false; }

  setLayout(patch) {
    this.screen.layout = { ...this.screen.layout, ...patch };
    this.app.store.set('layout', this.screen.layout);
    this.paintLayout();
    this.screen.draw();
  }

  paintLayout() {
    const l = this.screen.layout;
    document.querySelectorAll('#csLayout .chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === l.type)));
    document.querySelectorAll('#csCols .chip').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === l.cols)));
    $('csHideRating').checked = l.hideRating;
    $('csHideYear').checked = l.hideYear;
    $('csColsBox').hidden = !['grid', 'album'].includes(l.type);
  }
}
