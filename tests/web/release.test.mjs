import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_VERSION,clientErrorCode} from '../../web/release.js';

test('legacy shells receive their existing update instruction, current clients retain agreement recovery',()=>{
 const old=new Request('https://example.test/api/food/create');
 const current=new Request(old,{headers:{'X-LMB-Client-Version':APP_VERSION}});
 assert.equal(clientErrorCode('agreement_required',old),'upgrade_required');
 assert.equal(clientErrorCode('agreement_required',current),'agreement_required');
 assert.equal(clientErrorCode('conflict',old),'conflict');
 assert.equal(clientErrorCode('unauthorized',old),'unauthorized');
});
test('published client and server release identifiers agree without changing the legal agreement version',()=>{
 const client=readFileSync(new URL('../../static/app.js',import.meta.url),'utf8');
 assert.match(client,new RegExp('const CLIENT_VERSION = "'+APP_VERSION.replaceAll('.','\\.')+'"'));
 assert.match(client,/upgrade_required:/);
});
