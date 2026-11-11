import { el } from '../utils/dom.js';

// Parent class of every screen. A screen gets the shared services in ctx and draws itself into root.
export class BaseView {
  constructor(ctx) { this.ctx = ctx; } // ctx = { auth, trakt, simkl }

  card(title) {
    const card = el('div', undefined, 'card');
    if (title) card.append(el('h2', title));
    return card;
  }

  async render(root) { throw new Error('A view must implement render(root)'); }
}
