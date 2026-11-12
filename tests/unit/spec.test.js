const assert = require('assert');
const run = require('./_load')(['core/core.js', 'core/trakt.js']);

// Score pills (IMDb, Rotten Tomatoes critics and audience, MAL)
const pills = run('ratingPills');
assert.deepStrictEqual(Array.from(pills({
  rating: 7.7, trakt: { rating: 7.7 }, imdb: { rating: 8 }, rotten_tomatoes: { rating: 80, user_rating: 78 }, mal: { rating: 8.4 },
})), ['★ 77%', 'IMDb 8.0', '🍅 80%', '🍿 78%', 'MAL 8.40']);
assert.strictEqual(pills(null).length, 0);
assert.strictEqual(run('imageUrl')('media.trakt.tv/images/posters/x/thumb/a.jpg', 'medium'), 'https://media.trakt.tv/images/posters/x/medium/a.jpg');

(async () => {
  const api = run('new TraktApi({ tokens: null, refresh: async () => false, logout() {} })');
  const calls = [];
  api.call = async (path) => {
    calls.push(path);
    if (path.startsWith('/sync/progress/up_next')) return [
      { show: { title: 'A', ids: { trakt: 1 } }, progress: { aired: 8, completed: 1, next_episode: { season: 4, number: 2, ids: { trakt: 9 } }, stats: { minutes_left: 294 } } },
      { show: { title: 'Done', ids: { trakt: 2 } }, progress: { aired: 3, completed: 3, next_episode: null } },
    ];
    if (path.includes('/watchnow/')) return { us: { subscription: [{ source: 'netflix', link: 'x' }] } };
    if (path.startsWith('/users/settings')) return { browsing: { watchnow: { country: 'DE' } } };
    if (path.startsWith('/sync/favorites/movies')) return [{ rank: 1, type: 'movie', movie: { ids: { trakt: 5 } } }];
    if (path.startsWith('/sync/favorites/shows')) return [{ rank: 1, type: 'show', show: { ids: { trakt: 6 } } }];
    if (path.startsWith('/calendars/')) return [];
    throw new Error('unexpected ' + path);
  };

  const rows = await api.upNext(20);
  assert.strictEqual(rows.length, 1, 'finished shows are dropped');
  assert.strictEqual(rows[0].left, 7);
  assert.strictEqual(rows[0].minutesLeft, 294);
  assert.strictEqual(rows[0].next.number, 2);
  assert.ok(calls[0].includes('include_stats=true'));

  assert.strictEqual(await api.country(), 'de', 'country comes from the Trakt settings');
  const fav = await api.favorites();
  assert.ok(fav.has('movie:5') && fav.has('show:6'));

  await api.calendar();
  assert.ok(calls.some((c) => c.startsWith('/calendars/my/shows/premieres/')));
  assert.ok(calls.some((c) => c.startsWith('/calendars/my/shows/finales/')));

  // when Up Next fails, the old history based method takes over
  api.call = async (path) => { if (path.startsWith('/sync/progress/up_next')) throw new Error('boom'); if (path.startsWith('/sync/history')) return []; throw new Error('unexpected ' + path); };
  assert.strictEqual((await api.upNext(20)).length, 0);
  console.log('spec tests OK');
})().catch((e) => { console.error(e); process.exit(1); });
