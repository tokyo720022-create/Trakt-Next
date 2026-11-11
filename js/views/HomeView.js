import { BaseView } from './BaseView.js';
import { el } from '../utils/dom.js';

export class HomeView extends BaseView {
  async render(root) {
    const account = this.card('Trakt account');
    const recent = this.card('Recently watched');
    const simkl = this.card('Simkl sync');
    simkl.append(el('span', 'Coming in the next version.', 'muted'));
    root.append(account, recent, simkl);

    try {
      const me = await this.ctx.trakt.getSettings();
      account.append(el('div', me.user.username));
      recent.append(this.historyList(await this.ctx.trakt.getHistory(10)));
    } catch (err) {
      account.append(el('div', 'Could not load your data: ' + err.message));
      recent.remove();
    }
  }

  historyList(items) {
    if (!items.length) return el('span', 'No history yet.', 'muted');
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
