const assert = require('assert');
const run = require('./_load')(['core/core.js', 'core/trakt.js', 'features/mark-sheet.js']);

const Mark = run('MarkSheet');
assert.strictEqual(Mark.iso('2019-07-20'), '2019-07-20T00:00:00.000Z');
assert.strictEqual(Mark.iso('2019-07-20T10:00:00.000Z'), '2019-07-20T10:00:00.000Z');
assert.strictEqual(Mark.iso(''), '');
assert.strictEqual(Mark.localNow(new Date(2026, 10, 12, 7, 1)), '2026-11-12T07:01');
assert.strictEqual(run('fmtSpan')(294), '4h 54m');
assert.strictEqual(run('fmtSpan')(3510), '2d 10h 30m');

(async () => {
  const api = run('new TraktApi({ tokens: null, refresh: async () => false, logout() {} })');
  const sent = [];
  api.call = async (path, method, body) => { sent.push({ path, method, body: JSON.stringify(body) }); return {}; };
  api.tracked = async () => ({ flags: {} });
  const show = { ids: { trakt: 7 } };
  await api.setEpisode(show, { ids: { trakt: 99 } }, true, '2019-07-20T00:00:00.000Z');
  assert.strictEqual(sent[0].path, '/sync/history');
  assert.strictEqual(sent[0].body, '{"episodes":[{"ids":{"trakt":99},"watched_at":"2019-07-20T00:00:00.000Z"}]}');
  await api.setEpisode(show, { ids: { trakt: 99 } }, true);
  assert.strictEqual(sent[1].body, '{"episodes":[{"ids":{"trakt":99}}]}', 'just now sends no date');
  await api.setEpisode(show, { ids: { trakt: 99 } }, false, '2020-01-01T00:00:00.000Z');
  assert.strictEqual(sent[2].path, '/sync/history/remove');
  assert.strictEqual(sent[2].body, '{"episodes":[{"ids":{"trakt":99}}]}', 'removing never sends a date');
  await api.setWatched({ type: 'movie', movie: { ids: { trakt: 5 } } }, true, '2014-03-14T00:00:00.000Z');
  assert.strictEqual(sent[3].body, '{"movies":[{"ids":{"trakt":5},"watched_at":"2014-03-14T00:00:00.000Z"}]}');
  await api.checkin('episode', { ids: { trakt: 99 } });
  assert.strictEqual(sent[4].path, '/checkin');
  assert.strictEqual(sent[4].body, '{"episode":{"ids":{"trakt":99}}}');
  console.log('mark tests OK');
})().catch((e) => { console.error(e); process.exit(1); });
