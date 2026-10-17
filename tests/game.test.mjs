import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, createRecord } from '../dist/lottery.js';
import { VERDICTS } from '../dist/verdicts.js';
import { STORAGE_KEY, dayKey, emptyProgress, parseProgress, dailyCountry, addToPassport, shareText } from '../dist/game.js';

test('progress defaults are independent and use a versioned storage key', () => {
  assert.equal(STORAGE_KEY, 'parallel-passport-play-v1');
  const first = emptyProgress(), second = emptyProgress();
  first.collected.push('JP');
  assert.deepEqual(second, { version: 1, travelerId: '', collected: [], totalDraws: 0, daily: null });
});

test('corrupt, huge, unversioned, and hostile storage is safely discarded', () => {
  for (const value of [null, undefined, {}, '', '{', 'null', '[]', '7', '{}', '{"version":2}', ' '.repeat(100_001)]) {
    assert.deepEqual(parseProgress(value), emptyProgress());
  }
  const raw = '{"version":1,"travelerId":"<script>alert(1)</script>","collected":["JP","JP","FR","__proto__",{},null,"jp"],"totalDraws":"999","daily":{"day":"2026-10-16","countryCode":"ZZ","serial":"<img>","date":"2026.10.16"},"__proto__":{"polluted":true},"photo":"private image","name":"private name"}';
  assert.deepEqual(parseProgress(raw), { version: 1, travelerId: '', collected: ['JP', 'FR'], totalDraws: 0, daily: null });
  assert.equal({}.polluted, undefined);
});

test('progress keeps only safe fields, caps counters, and rejects invalid identifiers', () => {
  const daily = { day: '2026-10-16', countryCode: 'IS', serial: 'FUN-M2AB-0000', date: '2026.10.16', photo: 'private' };
  const clean = parseProgress(JSON.stringify({ version: 1, travelerId: 'device-abc_123', collected: ['IS', 'CH', 'IS'], totalDraws: 1e30, daily, name: 'private' }));
  assert.deepEqual(clean, { version: 1, travelerId: 'device-abc_123', collected: ['IS', 'CH'], totalDraws: 1_000_000,
    daily: { day: '2026-10-16', countryCode: 'IS', serial: 'FUN-M2AB-0000', date: '2026.10.16' } });
  for (const travelerId of ['a'.repeat(81), 'has spaces', 'line\nbreak', '身份信息', '__proto__.x']) {
    assert.equal(parseProgress(JSON.stringify({ version: 1, travelerId })).travelerId, '');
  }
  for (const [totalDraws, expected] of [[-3, 0], [4.9, 4], [9, 9]]) {
    assert.equal(parseProgress(JSON.stringify({ version: 1, totalDraws })).totalDraws, expected);
  }
});

test('daily storage requires a real calendar day and matching safe date and serial', () => {
  const valid = { day: '2028-02-29', countryCode: 'NZ', serial: 'DAILY-20280229-AB12', date: '2028.02.29' };
  const parseDaily = daily => parseProgress(JSON.stringify({ version: 1, daily })).daily;
  assert.deepEqual(parseDaily(valid), valid);
  for (const patch of [{ day: '2026-02-29' }, { day: '2026-02-30' }, { day: '2026-13-01' }, { day: 'invalid' },
    { countryCode: 'XX' }, { serial: '' }, { serial: 'a'.repeat(81) }, { serial: 'FUN-<script>' }, { date: '2028.03.01' }]) {
    assert.equal(parseDaily({ ...valid, ...patch }), null);
  }
});

test('day keys cross midnight in Shanghai independently of host timezone', () => {
  assert.equal(dayKey(new Date('2026-10-15T15:59:59.999Z')), '2026-10-15');
  assert.equal(dayKey(new Date('2026-10-15T16:00:00.000Z')), '2026-10-16');
  assert.equal(dayKey(new Date('2026-12-31T16:00:00.000Z')), '2027-01-01');
});

test('daily draw is stable for a device and day but can vary across days and devices', () => {
  const expected = dailyCountry('2026-10-16', 'device-123');
  for (let i = 0; i < 100; i++) assert.equal(dailyCountry('2026-10-16', 'device-123'), expected);
  const days = new Set(), devices = new Set();
  for (let i = 1; i <= 60; i++) {
    const day = dayKey(new Date(Date.UTC(2026, 9, i)));
    days.add(dailyCountry(day, 'device-123').code);
    devices.add(dailyCountry('2026-10-16', `device-${i}`).code);
  }
  assert(days.size > 1);
  assert(devices.size > 1);
  assert(COUNTRIES.includes(expected));
});

test('daily seeded draws preserve the original seventy percent Japan design', () => {
  let japan = 0;
  const counts = new Set();
  for (let i = 0; i < 10_000; i++) {
    const country = dailyCountry('2026-10-16', `test-device-${i}`);
    if (country.code === 'JP') japan++;
    counts.add(country.code);
  }
  assert(japan > 6700 && japan < 7300, `Unexpected Japan count: ${japan}`);
  assert.equal(counts.size, COUNTRIES.length);
});

test('passport deduplicates destinations while counting every draw without mutation', () => {
  const daily = Object.freeze({ day: '2026-10-16', countryCode: 'JP', serial: 'DAILY-123', date: '2026.10.16' });
  const original = Object.freeze({ ...emptyProgress(), travelerId: 'device-1', collected: Object.freeze(['JP']), totalDraws: 2, daily });
  const duplicate = addToPassport(original, createRecord('private', 70, COUNTRIES[0]));
  assert.deepEqual(duplicate.collected, ['JP']);
  assert.equal(duplicate.totalDraws, 3);
  assert.equal(original.totalDraws, 2);
  assert.notEqual(duplicate.collected, original.collected);
  assert.notEqual(duplicate.daily, original.daily);
  const next = addToPassport(duplicate, createRecord('private', 70, COUNTRIES[1]));
  assert.deepEqual(next.collected, ['JP', 'IT']);
  assert.equal(next.totalDraws, 4);
  const capped = addToPassport({ ...next, totalDraws: 1_000_000 }, { country: COUNTRIES[0] });
  assert.equal(capped.totalDraws, 1_000_000);
  assert.deepEqual(addToPassport(original, { country: { code: '<script>' } }), original);
});

test('sharing is concise entertainment text with an official link and no private fields', () => {
  const record = { ...createRecord('我的私人姓名', 70, COUNTRIES[2]), photo: 'private-photo-url', extra: '<script>bad</script>' };
  for (const mode of ['free', 'daily']) {
    const text = shareText(record, mode);
    assert.match(text, /法国/);
    assert.match(text, /娱乐随机结果/);
    assert.match(text, /不代表真实国籍/);
    assert.match(text, /https:\/\/parallel-passport-kai\.imjusttrying341\.chatgpt\.site/);
    assert.doesNotMatch(text, /我的私人姓名|private-photo-url|<script>|外貌|照片/);
    assert(text.length < 180);
  }
  assert.match(shareText(record, 'daily'), /今日旅行签/);
  assert.doesNotMatch(shareText({ country: { code: '<script>', name: '<script>' } }), /<script>/);
});

test('sharing carries the current approved verdict without rerolling or accepting injected copy', () => {
  for (const verdict of VERDICTS) {
    const record = { ...createRecord('私人姓名', 70, COUNTRIES[0]), verdict: { ...verdict, title: '<script>injected</script>', line: 'arbitrary private input' } };
    const first = shareText(record);
    assert(first.includes(verdict.title));
    assert(first.includes(verdict.line));
    assert.equal(shareText(record), first);
    assert.doesNotMatch(first, /私人姓名|injected|arbitrary private input/);
    assert(first.length < 180);
  }
  const unknown = shareText({ country: COUNTRIES[0], verdict: { id: 'unknown', title: 'injected' } });
  assert.doesNotMatch(unknown, /本官判词|injected/);
});
