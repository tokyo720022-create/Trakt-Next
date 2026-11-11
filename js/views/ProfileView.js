import { BaseView } from './BaseView.js';
import { KINDS } from '../core/MediaKind.js';
import { el } from '../utils/dom.js';

export class ProfileView extends BaseView {
  async render(root) {
    const account = this.card('Trakt account');
    const sync = this.card('Sync routes');
    for (const { label, syncTo } of Object.values(KINDS)) {
      sync.append(el('div', `${label} → Trakt, ${syncTo.join(', ')}`));
    }
    sync.append(el('small', 'Simkl and AniList login come in the next version.', 'muted'));
    root.append(account, sync);
    try {
      const me = await this.ctx.trakt.getSettings();
      account.append(el('div', me.user.username));
    } catch (err) {
      account.append(el('div', 'Could not load your account: ' + err.message));
    }
  }
}
