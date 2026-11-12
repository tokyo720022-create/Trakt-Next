/* customlists.js: the user's own Trakt lists: see them, open one, create a new one. */
class CustomLists {
  constructor(app) {
    this.app = app;
    this.inside = false;
    $('clBack').onclick = () => { if (this.inside) this.showLists(); else $('clsheet').hidden = true; };
    $('clCreate').onclick = () => this.create();
  }

  async open() { $('clsheet').hidden = false; await this.showLists(); }

  async showLists() {
    this.inside = false;
    $('clTitle').textContent = 'Custom lists';
    $('clMake').hidden = false;
    const box = $('clBody');
    box.replaceChildren(el('p', 'Loading…', 'muted'));
    try {
      const lists = await this.app.trakt.customLists();
      box.replaceChildren(...lists.map((l) => {
        const b = el('button', `${l.name} · ${l.item_count || 0}`, 'go alt');
        b.style.cssText = 'display:block;width:100%;text-align:left;margin-top:8px';
        b.onclick = () => this.showItems(l);
        return b;
      }));
      if (!lists.length) box.append(el('p', 'No custom lists yet. Create one above.', 'muted'));
    } catch (err) { box.replaceChildren(el('p', 'Could not load your lists: ' + err.message, 'muted')); }
  }

  async showItems(list) {
    this.inside = true;
    $('clTitle').textContent = list.name;
    $('clMake').hidden = true;
    const box = $('clBody');
    box.replaceChildren(el('p', 'Loading…', 'muted'));
    try {
      const raw = await this.app.trakt.listItems(list.ids.trakt);
      const items = raw.filter((r) => r.type === 'movie' || r.type === 'show');
      const layout = this.app.lists.layout;
      const grid = el('div', undefined, 'lay-' + layout.type);
      grid.style.setProperty('--cols', layout.cols);
      items.forEach((i) => grid.append(Cards.build(i, layout, (it) => this.app.detail.open(it))));
      box.replaceChildren(items.length ? grid : el('p', 'This list is empty.', 'muted'));
    } catch (err) { box.replaceChildren(el('p', 'Could not load this list: ' + err.message, 'muted')); }
  }

  async create() {
    const name = $('clName').value.trim();
    if (!name) return;
    try { await this.app.trakt.createList(name); $('clName').value = ''; await this.showLists(); }
    catch (err) { $('clBody').prepend(el('p', 'Could not create the list: ' + err.message, 'muted')); }
  }
}
