import { BaseView } from './BaseView.js';
import { el } from '../utils/dom.js';

export class LoginView extends BaseView {
  async render(root) {
    const card = this.card('Welcome');
    const button = el('button', 'Log in with Trakt');
    button.onclick = () => this.ctx.auth.startLogin();
    card.append(button);
    root.append(card);
  }
}
