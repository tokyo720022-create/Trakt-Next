/* item-sheet.js: details of one title, with the changes you can make: watchlist, watched (movies), rating, custom list. */
class ItemSheet {
  constructor(app) {
    this.app = app;
    this.item = null;
    this.cur = { flags: {}, rating: 0 };
    const rating = $('isRating');
    rating.append(new Option('Not rated', 0));
    for (let n = 10; n >= 1; n--) rating.append(new Option(String(n), n));
    $('isBack').onclick = () => { $('isheet').hidden = true; };
    $('isWatchlist').onclick = () => this.run(() => app.trakt.setWatchlist(this.item, !this.cur.flags.watchlist));
    $('isWatched').onclick = () => this.run(() => app.trakt.setWatched(this.item, !this.cur.flags.watched));
    $('isRate').onclick = () => this.run(() => app.trakt.rate(this.item, +$('isRating').value));
    $('isAddList').onclick = () => {
      const id = $('isList').value;
      if (id) this.run(() => app.trakt.addToList(id, this.item), 'Added to your list');
    };
  }

  async open(item) {
    const type = item.type === 'movie' ? 'movie' : 'show';
    this.item = { type, [type]: mediaOf(item) }; // an episode opens as its show
    const m = mediaOf(this.item);
    $('isTitle').textContent = m.title || 'Unknown';
    $('isMeta').textContent = [m.year, (m.genres || []).join(', ')].filter(Boolean).join(' · ');
    $('isOverview').textContent = m.overview || '';
    $('isMsg').textContent = '';
    $('isWatched').hidden = type !== 'movie';
    $('isheet').hidden = false;
    try { this.cur = (await this.app.trakt.find(this.item)) || { flags: {}, rating: 0 }; } catch (e) { this.cur = { flags: {}, rating: 0 }; }
    this.paint();
    this.fillLists();
  }

  paint() {
    $('isWatchlist').textContent = this.cur.flags.watchlist ? 'Remove from watchlist' : 'Add to watchlist';
    $('isWatched').textContent = this.cur.flags.watched ? 'Mark as not watched' : 'Mark as watched';
    $('isRating').value = String(this.cur.rating || 0);
  }

  async fillLists() {
    const select = $('isList');
    select.replaceChildren();
    try {
      const lists = await this.app.trakt.customLists();
      lists.forEach((l) => select.append(new Option(l.name, l.ids.trakt)));
      if (!lists.length) select.append(new Option('No custom lists yet', ''));
    } catch (e) { select.append(new Option('Could not load lists', '')); }
  }

  async run(change, done = 'Saved to Trakt') {
    $('isMsg').textContent = 'Saving…';
    try {
      await change();
      this.cur = (await this.app.trakt.find(this.item)) || this.cur;
      this.paint();
      $('isMsg').textContent = done;
      this.app.lists.draw();
    } catch (err) { $('isMsg').textContent = 'Could not save: ' + err.message; }
  }
}
