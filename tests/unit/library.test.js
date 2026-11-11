const assert = require('assert');
const run = require('./_load')(['core/core.js', 'core/trakt.js']);

(async () => {
  const api = run('new TraktApi({ tokens: null, refresh: async () => false, logout() {} })');
  const m1 = { title: 'M1', ids: { trakt: 1 }, genres: ['drama'], year: 2020 };
  const s1 = { title: 'S1', ids: { trakt: 2 }, genres: ['anime', 'action'], year: 2024 };
  api.call = async (path) => {
    if (path.startsWith('/sync/watched/movies')) return [{ plays: 2, last_watched_at: '2026-11-01T00:00:00Z', movie: m1 }];
    if (path.startsWith('/sync/watched/shows')) return [{ plays: 10, last_watched_at: '2026-11-05T00:00:00Z', show: s1 }];
    if (path.startsWith('/sync/watchlist')) return [{ type: 'movie', listed_at: '2026-11-02T00:00:00Z', movie: m1 }, { type: 'season', season: {} }];
    if (path.startsWith('/sync/ratings')) return [{ type: 'show', rating: 8, rated_at: '2026-11-06T00:00:00Z', show: s1 }];
    throw new Error('unexpected ' + path);
  };
  const lib = await api.library();
  assert.strictEqual(lib.length, 2, 'one item per title, seasons ignored');
  const movie = lib.find((i) => i.type === 'movie');
  assert.ok(movie.flags.watched && movie.flags.watchlist, 'movie is watched and on the watchlist');
  assert.strictEqual(movie.plays, 2);
  const show = lib.find((i) => i.type === 'show');
  assert.strictEqual(show.rating, 8);
  assert.strictEqual(show.when, '2026-11-06T00:00:00Z', 'latest date wins');
  assert.strictEqual(run('kindOf')(show), 'anime');
  assert.strictEqual(run('kindOf')(movie), 'movies');
  assert.strictEqual(run('kindOf')({ type: 'show', show: { genres: ['drama'] } }), 'shows');

  api.call = async (path) => (path.includes('/shows/') ? [{ watchers: 5, show: s1 }] : []);
  assert.strictEqual((await api.discover('trending', 'anime')).length, 1, 'anime discover keeps anime');
  assert.strictEqual((await api.discover('trending', 'shows')).length, 0, 'shows discover drops anime');
  assert.strictEqual(run('imageUrl')(['media.trakt.tv/x.jpg']), 'https://media.trakt.tv/x.jpg');
  console.log('library tests OK');
})().catch((e) => { console.error(e); process.exit(1); });
