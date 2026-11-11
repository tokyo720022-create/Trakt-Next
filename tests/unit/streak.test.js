const assert = require('assert');
const run = require('./_load')(['core/core.js', 'features/streak.js']);
const Streak = run('Streak');
const now = new Date(2026, 10, 11, 12); // 11 Nov 2026
const at = (d) => new Date(2026, 10, d, 9).toISOString();

let s = Streak.compute([7, 8, 9, 10, 11, 3, 4].map(at), now);
assert.strictEqual(s.current, 5, 'five days in a row up to today');
assert.strictEqual(s.previous, 2, 'the run before the gap');
assert.strictEqual(s.activeMonth, 7);
assert.strictEqual(s.dropped, 1, 'one streak ended this month');
assert.strictEqual(s.monthRun, 5);

s = Streak.compute([8, 9, 10].map(at), now);
assert.strictEqual(s.current, 3, 'no play yet today does not break the streak');
assert.strictEqual(s.last7.length, 7);
assert.strictEqual(s.last7[6], false);
assert.strictEqual(s.last7[5], true);

s = Streak.compute([], now);
assert.strictEqual(s.current, 0);
assert.strictEqual(s.previous, 0);
console.log('streak tests OK');
