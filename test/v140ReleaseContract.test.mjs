import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('admin package and gateway advertise current 1.6.3 release',()=>{const pkg=JSON.parse(read('package.json'));assert.equal(pkg.version,'1.6.3');const server=read('server/server.js');assert.match(server,/Admin Gateway 1\.6\.3/);});
