import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const trips = fs.readFileSync(new URL('../src/TripsPage.jsx', import.meta.url), 'utf8');
const customers = fs.readFileSync(new URL('../src/CustomersPage.jsx', import.meta.url), 'utf8');
const states = fs.readFileSync(new URL('../src/AdminPageState.jsx', import.meta.url), 'utf8');

test('TrackAsia Enterprise shell stays usable at mobile widths and reduced motion', () => {
  assert.match(css, /@media\s*\(max-width:\s*768px\)/);
  assert.match(css, /\.sidebar-mobile-open\s+\.sidebar/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(app, /aria-label=/);
});

test('detail drawers are proper modal dialogs', () => {
  for (const source of [trips, customers]) {
    assert.match(source, /role=["']dialog["']/);
    assert.match(source, /aria-modal=["']true["']/);
  }
});

test('shared async state is announced to assistive technology', () => {
  assert.match(states, /aria-live=["']polite["']/);
});
