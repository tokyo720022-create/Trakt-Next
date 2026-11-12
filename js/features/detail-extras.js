/* detail-extras.js: the lower sections of the title screen: Actors, Reviews, Related, Popular Lists, Details. */
class DetailExtras {
  constructor(app, screen) {
    this.app = app;
    this.screen = screen;
    this.kind = 'likes';
    $('dtRevKinds').onclick = (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      this.kind = b.dataset.k;
      document.querySelectorAll('#dtRevKinds .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
      this.reviews(this.screen.item, this.screen.seq);
    };
  }

  load(item, seq) {
    const t = this.app.trakt;
    const ok = () => seq === this.screen.seq;
    const guard = (id, promise, draw) => promise
      .then((v) => { if (ok()) draw(v); })
      .catch((e) => { if (ok()) $(id).replaceChildren(el('p', 'Could not load: ' + e.message, 'muted')); });
    guard('dtCast', t.people(item), (p) => this.cast(p));
    this.reviews(item, seq);
    guard('dtRelated', t.related(item), (v) => this.related(v));
    guard('dtLists', t.popularLists(item), (v) => this.lists(v));
    Promise.all([t.stats(item).catch(() => ({})), t.people(item).catch(() => null), t.studios(item).catch(() => [])])
      .then(([stats, people, studios]) => { if (ok()) this.details(item, stats, people, studios); });
  }

  fill(id, nodes, empty) { $(id).replaceChildren(...(nodes.length ? nodes : [el('p', empty, 'muted')])); }

  card(image, title, sub, onTap) {
    const c = el('div', undefined, 'pc');
    const img = el('div', undefined, 'pimg');
    setImage(img, image, (title || '?').charAt(0));
    c.append(img, el('div', title, 't'), el('div', sub, 'm'));
    if (onTap) c.onclick = onTap;
    return c;
  }

  cast(people) {
    const list = (people && people.cast) || [];
    const crew = (people && people.crew) || {};
    const director = (crew.directing || []).find((c) => (c.jobs || []).includes('Director'));
    if (director && this.screen.item.type === 'movie') this.screen.setDirector(director.person.name);
    this.fill('dtCast', list.slice(0, 15).map((c) => this.card(imageUrl(c.person.images && c.person.images.headshot), c.person.name, (c.characters || [])[0] || '')), 'No cast listed.');
  }

  async reviews(item, seq) {
    $('dtReviews').replaceChildren(el('p', 'Loading…', 'muted'));
    try {
      const rows = await this.app.trakt.comments(item, this.kind);
      if (seq !== this.screen.seq) return;
      this.fill('dtReviews', rows.map((r) => this.review(r)), 'No reviews yet.');
    } catch (err) { if (seq === this.screen.seq) $('dtReviews').replaceChildren(el('p', 'Could not load: ' + err.message, 'muted')); }
  }

  review(r) {
    const card = el('div', undefined, 'rv');
    const head = el('div', undefined, 'rvhead');
    const who = el('div');
    who.append(el('div', r.user.name || r.user.username, 't'), el('div', fmtDate(r.created_at), 'm'));
    head.append(who);
    if (r.user_rating) head.append(el('span', '★ ' + stars5(r.user_rating), 'star'));
    const text = el('p', (r.comment || '').slice(0, 400));
    if (r.spoiler) { // spoilers stay blurred until tapped
      text.className = 'blur';
      text.onclick = () => text.classList.remove('blur');
      card.append(head, el('small', 'Spoiler: tap to show', 'muted'), text);
    } else card.append(head, text);
    card.append(el('div', `👍 ${r.likes || 0}  ·  💬 ${r.replies || 0}`, 'm'));
    return card;
  }

  related(items) {
    this.fill('dtRelated', items.map((i) => {
      const m = mediaOf(i);
      return this.card(posterOf(m), m.title, [m.year, fmtRuntime(m.runtime)].filter(Boolean).join(' • '), () => this.screen.open(i));
    }), 'Nothing related yet.');
  }

  lists(rows) {
    this.fill('dtLists', rows.map((r) => {
      const c = el('div', undefined, 'rv');
      c.append(el('div', r.list.name, 't'), el('div', 'by ' + (r.list.user.name || r.list.user.username), 'm'),
        el('div', `♥ ${r.list.likes || r.like_count || 0}  ·  ${r.list.item_count || 0} titles`, 'm'));
      return c;
    }), 'No popular lists yet.');
  }

  details(item, stats, people, studios) {
    const m = mediaOf(item);
    const box = $('dtDetails');
    box.replaceChildren();
    const tiles = el('div', undefined, 'tiles4');
    for (const [label, n] of [['Plays', stats.plays], ['Watchers', stats.watchers], ['Lists', stats.lists], ['Favorites', stats.favorited]]) {
      const tile = el('div', undefined, 'tile');
      tile.append(el('div', label, 'm'), el('b', compact(n)));
      tiles.append(tile);
    }
    const crew = (people && people.crew) || {};
    const names = (key) => (crew[key] || []).slice(0, 2).map((c) => c.person.name).join(', ');
    const isMovie = item.type === 'movie';
    const rows = [
      ['Premiered', fmtDate(isMovie ? m.released : m.first_aired)], ['Runtime', fmtRuntime(m.runtime)],
      [isMovie ? 'Director' : 'Network', isMovie ? names('directing') : m.network || ''], ['Writer', names('writing')],
      ['Country', (m.country || '').toUpperCase()], ['Language', (m.language || '').toUpperCase()],
      ['Studio', (studios || []).slice(0, 2).map((s) => s.name).join(', ')], ['Genre', (m.genres || []).map(cap).join(', ')],
    ].filter((r) => r[1]);
    const grid = el('div', undefined, 'kv');
    for (const [k, v] of rows) { const cell = el('div'); cell.append(el('small', k), el('div', v)); grid.append(cell); }
    const links = el('div', undefined, 'links');
    const ids = m.ids || {};
    for (const [label, url] of [
      ['Official site', m.homepage], ['IMDb', ids.imdb && 'https://www.imdb.com/title/' + ids.imdb],
      ['TMDB', ids.tmdb && `https://www.themoviedb.org/${isMovie ? 'movie' : 'tv'}/${ids.tmdb}`],
      ['Trakt', ids.slug && `https://trakt.tv/${item.type}s/${ids.slug}`],
    ]) {
      if (!url) continue;
      const b = el('button', label, 'go alt');
      b.onclick = () => openLink(url);
      links.append(b);
    }
    box.append(tiles, grid, el('div', 'Links', 'q'), links);
  }
}
