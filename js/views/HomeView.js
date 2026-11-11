import { BaseView } from './BaseView.js';
import { KINDS, kindOf } from '../core/MediaKind.js';
import { el } from '../utils/dom.js';

// Home: one chip per section (Movies, TV Shows, Anime), each with its own history.
export class HomeView extends BaseView {
  async render(root) {
    const chips = el('div', undefined, 'chips');
    const body = el('div');
    root.append(chips, body);

    let items;
    try { items = await this.ctx.trakt.getHistory(50); }
    catch (err) { body.append(el('div', 'Could not load your history: ' + err.message, 'card')); return; }

    const draw = () => {
      const current = this.ctx.state.kind;
      chips.replaceChildren();
      for (const [id, { label }] of Object.entries(KINDS)) {
        const count = items.filter((i) => kindOf(i) === id).length;
        const chip = el('button', `${label} · ${count}`, 'chip' + (id === current ? ' active' : ''));
        chip.onclick = () => { this.ctx.state.kind = id; draw(); };
        chips.append(chip);
      }
      const card = this.card('History');
      card.append(this.historyList(items.filter((i) => kindOf(i) === current)));
      body.replaceChildren(el('small', 'Changes here also go to: ' + KINDS[current].syncTo.join(' and '), 'muted'), card);
    };
    draw();
  }

  historyList(items) {
    if (!items.length) return el('span', 'Nothing here yet.', 'muted');
    const list = el('ul');
    for (const item of items) {
      const li = el('li', this.titleOf(item));
      li.append(el('br'), el('small', new Date(item.watched_at).toLocaleString()));
      list.append(li);
    }
    return list;
  }

  titleOf(item) {
    if (item.type === 'episode') return `${item.show.title} S${item.episode.season}E${item.episode.number}`;
    return (item.movie || item.show || {}).title || 'Unknown';
  }
}
