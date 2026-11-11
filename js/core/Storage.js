// Small wrapper around localStorage. Every key gets a prefix and values are stored as JSON.
export class Storage {
  constructor(prefix = 'traktnext:') { this.prefix = prefix; }
  get(key) { try { return JSON.parse(localStorage.getItem(this.prefix + key)); } catch { return null; } }
  set(key, value) { localStorage.setItem(this.prefix + key, JSON.stringify(value)); }
  remove(key) { localStorage.removeItem(this.prefix + key); }
}
