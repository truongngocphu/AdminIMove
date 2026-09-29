import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/ProductionHealthPage.jsx'), 'utf8');

test('ProductionHealthPage exposes Security Test Mode controls', () => {
  assert.match(source, /Security Test Mode Center/);
  assert.match(source, /securityMode/);
  assert.match(source, /requireTrustedDevice/);
  assert.match(source, /Test Mode/);
  assert.match(source, /Production Mode/);
});
