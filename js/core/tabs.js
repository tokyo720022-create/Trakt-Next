/* tabs.js: the bottom navigation. */
class Tabs {
  constructor(onSelect) {
    this.onSelect = onSelect;
    $('tabs').addEventListener('click', (e) => { const b = e.target.closest('.tab'); if (b) this.select(b.dataset.v); });
  }
  select(view) {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.v === view)));
    this.onSelect(view);
  }
  show(on) { $('tabs').hidden = !on; }
}
