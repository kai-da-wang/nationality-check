import test from 'node:test';
import assert from 'node:assert/strict';
import { VERDICTS, getVerdict, drawVerdict } from '../dist/verdicts.js';

test('all twenty-four verdicts have unique safe IDs and fit the certificate text budget', () => {
  assert.equal(VERDICTS.length, 24);
  assert.equal(new Set(VERDICTS.map(verdict => verdict.id)).size, 24);
  assert.equal(new Set(VERDICTS.map(verdict => verdict.title)).size, 24);
  for (const verdict of VERDICTS) {
    assert.deepEqual(Object.keys(verdict), ['id', 'title', 'line', 'perk']);
    assert.match(verdict.id, /^v(?:0[1-9]|1[0-9]|2[0-4])$/);
    assert(Array.from(verdict.title).length >= 4 && Array.from(verdict.title).length <= 9, verdict.title);
    assert(Array.from(verdict.line).length <= 30, verdict.line);
    assert(Array.from(verdict.perk).length <= 20, verdict.perk);
    assert.match(verdict.line, /^本官判你.+。$/);
    assert.match(verdict.perk, /^今日特权：.+。$/);
    for (const field of [verdict.title, verdict.line, verdict.perk]) {
      assert.doesNotMatch(field, /[<>\u0000-\u001f]/);
    }
  }
});

test('the verdict catalog and each entry are immutable', () => {
  assert(Object.isFrozen(VERDICTS));
  for (const verdict of VERDICTS) {
    assert(Object.isFrozen(verdict));
    assert.throws(() => { verdict.title = '被修改'; }, TypeError);
  }
  assert.throws(() => { VERDICTS.push({}); }, TypeError);
  assert.throws(() => { VERDICTS[0] = {}; }, TypeError);
});

test('lookup only returns the canonical catalog entry for a valid exact ID', () => {
  for (const verdict of VERDICTS) assert.equal(getVerdict(verdict.id), verdict);
  for (const id of ['', 'V01', 'v1', 'v00', 'v25', ' v01', '<script>', '__proto__', 'constructor', null, undefined, {}, 1]) {
    assert.equal(getVerdict(id), null);
  }
});

test('every verdict is reachable in an equal initial draw interval', () => {
  const results = [];
  for (let index = 0; index < 24; index++) {
    const verdict = drawVerdict('', () => (index + 0.5) / 24);
    assert.equal(verdict, VERDICTS[index]);
    results.push(verdict.id);
  }
  assert.equal(new Set(results).size, 24);
});

test('excluding any previous verdict leaves twenty-three equal reachable intervals', () => {
  for (const previous of VERDICTS) {
    const options = VERDICTS.filter(verdict => verdict !== previous);
    const seen = new Set();
    for (let index = 0; index < 23; index++) {
      const result = drawVerdict(previous.id, () => (index + 0.5) / 23);
      assert.notEqual(result.id, previous.id);
      assert.equal(result, options[index]);
      seen.add(result.id);
    }
    assert.equal(seen.size, 23);
  }
});

test('a fixed random source still never repeats the immediately previous verdict', () => {
  for (const value of [0, 0.125, 0.5, 0.875, 1 - Number.EPSILON]) {
    let previousId = '';
    for (let index = 0; index < 200; index++) {
      const result = drawVerdict(previousId, () => value);
      assert.notEqual(result.id, previousId);
      previousId = result.id;
    }
  }
});

test('random boundaries are valid, unknown previous IDs are ignored, and bad random values are rejected', () => {
  assert.equal(drawVerdict('', () => 0), VERDICTS[0]);
  assert.equal(drawVerdict('', () => 1 - Number.EPSILON), VERDICTS[23]);
  assert.equal(drawVerdict('v01', () => 0), VERDICTS[1]);
  assert.equal(drawVerdict('v24', () => 1 - Number.EPSILON), VERDICTS[22]);
  assert.equal(drawVerdict('<script>', () => 0), VERDICTS[0]);
  for (const value of [-1, -Number.EPSILON, 1, 2, NaN, Infinity, -Infinity, '0.5', null, undefined, false, {}]) {
    assert.throws(() => drawVerdict('', () => value), RangeError);
  }
});

test('draws use only the supplied random source and do not write personal or persistent data', () => {
  let calls = 0;
  const random = () => { calls++; return 0.5; };
  const result = drawVerdict('v01', random);
  assert.equal(calls, 1);
  assert(VERDICTS.includes(result));
  assert.deepEqual(Object.keys(result), ['id', 'title', 'line', 'perk']);
  assert(VERDICTS.includes(drawVerdict()));
});
