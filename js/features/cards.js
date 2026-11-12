/* cards.js: the poster card used by the list screens, Discover and custom lists. */
class Cards {
  static DEFAULT_LAYOUT = { type: 'grid', cols: 3, hideRating: false, hideYear: false };

  static build(item, layout, onTap) {
    const media = mediaOf(item);
    const flags = item.flags || {};
    const card = el('div', undefined, 'mc');
    const poster = el('div', undefined, 'poster');
    setImage(poster, posterOf(media), (media.title || '?').charAt(0));
    const badge = flags.watched ? 'Watched' : flags.watchlist ? 'Watchlist' : '';
    if (badge) poster.append(el('span', badge, 'badge'));
    const meta = [];
    if (!layout.hideYear && media.year) meta.push(media.year);
    if (!layout.hideRating && item.rating) meta.push('★ ' + stars5(item.rating));
    else if (!layout.hideRating && media.rating) meta.push('★ ' + Math.round(media.rating * 10) + '%');
    const info = el('div', undefined, 'info');
    info.append(el('div', media.title || 'Unknown', 't'), el('div', meta.join(' · '), 'm'));
    card.append(poster, info);
    card.onclick = () => onTap(item);
    return card;
  }
}
