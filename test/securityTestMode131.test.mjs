import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'src/ProductionHealthPage.jsx'), 'utf8');

test('entering Test Mode disables test authentication gates by default', () => {
  const start = source.indexOf('function enterTestMode');
  const end = source.indexOf('export default function', start);
  const block = source.slice(start, end);
  assert.match(block, /requireFcm:\s*false/);
  assert.match(block, /requireTrustedDevice:\s*false/);
  assert.match(block, /requireIntegrity:\s*false/);
  assert.match(block, /requireFace:\s*false/);
  assert.match(block, /requireBiometric:\s*false/);
});
