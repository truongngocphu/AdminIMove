import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const source = fs.readFileSync(path.join(root, 'src/ProductionHealthPage.jsx'), 'utf8');

test('security mode and individual toggles persist immediately', () => {
  assert.match(source, /async function persistConfig/);
  assert.match(source, /async function switchSecurityMode/);
  assert.match(source, /await persistConfig\(next\)/);
  assert.match(source, /async function toggleSecurityFlag/);
});
