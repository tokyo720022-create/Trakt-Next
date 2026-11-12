const assert = require('assert');
const run = require('./_load')(['core/core.js', 'features/episodes.js']);
const next = run('EpisodeList').nextUnwatched;
const seasons = [
  { number: 0, episodes: [{ season: 0, number: 1 }] },
  { number: 2, episodes: [{ season: 2, number: 1, first_aired: '2999-01-01T00:00:00Z' }] },
  { number: 1, episodes: [{ season: 1, number: 1 }, { season: 1, number: 2 }] },
];
assert.strictEqual(next(seasons, new Set()).number, 1, 'starts at season 1 episode 1, specials ignored');
assert.strictEqual(next(seasons, new Set(['1:1'])).number, 2);
assert.strictEqual(next(seasons, new Set(['1:1', '1:2'])), null, 'unaired episodes are not next');

assert.strictEqual(run('stars5')(10), '5');
assert.strictEqual(run('stars5')(9), '4.5');
assert.strictEqual(run('fmtRuntime')(107), '1h 47m');
assert.strictEqual(run('fmtRuntime')(45), '45m');
assert.strictEqual(run('compact')(17600), '17.6K');
assert.strictEqual(run('compact')(53), '53');
console.log('detail tests OK');
