/* streak.js: the daily streak (from the dates of your plays) and its activity sheet. */
class Streak {
  // dates: ISO strings of plays. Returns the numbers shown on the Home card and the sheet.
  static compute(isos, now = new Date()) {
    const counts = new Map();
    for (const s of isos) { const k = dateKey(new Date(s)); counts.set(k, (counts.get(k) || 0) + 1); }
    const keyAt = (off) => dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - off));
    const active = (off) => counts.has(keyAt(off));
    const LIMIT = 4000;
    const start = active(0) ? 0 : 1; // a day with no play yet today does not break the streak
    let current = 0;
    while (current < LIMIT && active(start + current)) current++;
    let j = start + current;
    while (j < LIMIT && !active(j)) j++;
    let previous = 0;
    while (previous < LIMIT && active(j + previous)) previous++;
    const dom = now.getDate();
    let dropped = 0;
    let activeMonth = 0;
    for (let off = 0; off < dom; off++) {
      if (active(off)) activeMonth++;
      if (off >= 1 && !active(off) && active(off + 1)) dropped++;
    }
    const year = String(now.getFullYear());
    return {
      counts, current, previous, dropped, activeMonth, elapsed: dom,
      monthRun: Math.max(0, Math.min(current, dom - start)),
      activeYear: [...counts.keys()].filter((k) => k.startsWith(year + '-')).length,
      max: Math.max(1, ...counts.values()),
      last7: [6, 5, 4, 3, 2, 1, 0].map(active),
    };
  }
}

class StreakSheet {
  constructor(app) {
    this.app = app;
    $('ssBack').onclick = () => { $('ssheet').hidden = true; };
  }

  open(dates, now = new Date()) {
    const s = Streak.compute(dates, now);
    $('ssMonth').textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + ' · Media';
    $('ssHead').replaceChildren(...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => el('span', d)));
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(el('span'));
    for (let d = 1; d <= days; d++) {
      const n = s.counts.get(dateKey(new Date(now.getFullYear(), now.getMonth(), d))) || 0;
      const level = n ? 1 + Math.min(3, Math.floor((n / s.max) * 4 - 1e-9)) : 0;
      cells.push(el('i', undefined, (level ? 'l' + level : '') + (d === now.getDate() ? ' now' : '')));
    }
    $('ssGrid').replaceChildren(...cells);
    const pct = Math.round((s.activeMonth / s.elapsed) * 100);
    const stats = [
      [s.current, 'Current Streak', s.current ? 'Keep it going!' : 'Watch something today'],
      [s.previous, 'Previous Streak', 'Ended'],
      [s.monthRun, 'Monthly Streak', 'This month'],
      [s.dropped, 'Dropped Streaks', 'This month'],
      [`${s.activeMonth} (${pct}%)`, 'Active Days', 'This month'],
      [s.activeYear, 'Active Days', 'This year'],
    ];
    $('ssStats').replaceChildren(...stats.map(([n, t, sub]) => {
      const box = el('div', undefined, 'stat');
      box.append(el('b', String(n)), el('div', t), el('small', sub, 'muted'));
      return box;
    }));
    $('ssheet').hidden = false;
  }
}
