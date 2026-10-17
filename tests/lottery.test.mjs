import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, drawCountry, normalizeChance, cleanNickname, createRecord } from '../dist/lottery.js';

test('Japan interval and all remaining destinations are reachable', () => {
  assert.equal(drawCountry(70, () => 0).code, 'JP');
  assert.equal(drawCountry(70, () => .699999999).code, 'JP');
  for (let i = 0; i < 5; i++) {
    assert.equal(drawCountry(70, () => .7 + .06 * (i + .5)).code, COUNTRIES[i + 1].code);
  }
  assert.equal(drawCountry(70, () => .999999999).code, 'CH');
});

test('deterministic 100000 draws match the advertised weighting at every slider position', () => {
  for (let chance = 5; chance <= 95; chance += 5) {
    const counts = Object.fromEntries(COUNTRIES.map(c => [c.code, 0]));
    for (let i = 0; i < 100000; i++) counts[drawCountry(chance, () => (i + .5) / 100000).code]++;
    assert.equal(counts.JP, chance * 1000);
    for (const c of COUNTRIES.slice(1)) assert.equal(counts[c.code], (100 - chance) * 200);
  }
});

test('bad weights and random sources have bounded behavior', () => {
  assert.equal(normalizeChance('95'), 95);
  assert.equal(normalizeChance(999), 95);
  assert.equal(normalizeChance(-20), 5);
  assert.equal(normalizeChance(undefined), 70);
  for (const n of [1, -1, NaN]) assert.throws(() => drawCountry(70, () => n), RangeError);
});

test('nicknames are bounded by Unicode characters and suppress direction controls', () => {
  assert.equal(cleanNickname('  摸鱼大王  '), '摸鱼大王');
  assert.equal(cleanNickname(' \u202e\n '), '照片持有人');
  assert.equal(Array.from(cleanNickname('🐱'.repeat(20))).length, 16);
});

test('certificate records keep weight, fictional disclaimer, and Shanghai date', () => {
  const result = createRecord('测试用户', 70, COUNTRIES[0], () => 0, new Date('2026-10-15T17:00:00Z'));
  assert.equal(result.date, '2026.10.16');
  assert.equal(result.country.code, 'JP');
  assert.equal(result.chance, 70);
  assert.match(result.serial, /^FUN-[0-9A-Z]+-0000$/);
  assert.match(result.disclaimer, /娱乐随机结果/);
  assert(Object.isFrozen(result));
});
