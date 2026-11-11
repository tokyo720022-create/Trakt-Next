import { el } from '../utils/dom.js';

// Bottom navigation bar. Tabs are added here as the matching screens are built.
export class BottomNav {
  constructor(items, onSelect) {
    this.items = items;
    this.onSelect = onSelect;
    this.node = document.getElementById('nav');
  }

  render(active) {
    this.node.replaceChildren();
    for (const { id, label, icon } of this.items) {
      const button = el('button', undefined, 'nav-item' + (id === active ? ' active' : ''));
      button.append(el('span', icon, 'nav-icon'), el('small', label));
      button.onclick = () => this.onSelect(id);
      this.node.append(button);
    }
    this.node.hidden = false;
  }

  hide() { this.node.hidden = true; }
}
