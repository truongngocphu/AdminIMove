import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/AdminPageState.jsx',import.meta.url),'utf8');
test('shared TrackAsia page states exist',()=>{
  for(const cls of ['state-loading','state-empty','state-error','state-permission']) assert.match(source,new RegExp(cls));
  assert.match(source,/Thử lại/);
  assert.doesNotMatch(source,/undefined/);
});
