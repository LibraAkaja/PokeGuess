import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOptionSet } from './helpers.js';

test('buildOptionSet includes the correct answer and keeps options unique', () => {
  const correct = 'fire';
  const options = buildOptionSet(correct, ['water', 'grass', 'electric', 'psychic', 'ice'], 4);

  assert.ok(options.includes(correct));
  assert.equal(new Set(options).size, options.length);
  assert.equal(options.length, 4);
});
