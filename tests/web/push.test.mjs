import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,hkdfSync,createDecipheriv,createPublicKey,verify} from 'node:crypto';
import {base64url,fromBase64url,encryptPush,createVapidKeys,pushRequest,pushEndpoint,validateSubscription,deliverPush} from '../../web/web-push.js';
import {reminderPlan} from '../../web/push-service.js';
const b64=(s)=>Buffer.from(s,'base64url');
const endpoint='https://fcm.googleapis.com/fcm/send/synthetic-protocol-test';
test('aes128gcm reproduces the exact published RFC 8291 example',async()=>{
 const as='BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
 const ua='BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
 const bytes=b64(as),jwk={kty:'EC',crv:'P-256',x:base64url(bytes.subarray(1,33)),y:base64url(bytes.subarray(33)),d:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'};
 const pair={privateKey:await crypto.subtle.importKey('jwk',jwk,{name:'ECDH',namedCurve:'P-256'},false,['deriveBits']),publicKey:await crypto.subtle.importKey('raw',bytes,{name:'ECDH',namedCurve:'P-256'},true,[])};
 const result=await encryptPush({keys:{p256dh:ua,auth:'BTBZMqHH6r4Tts7J_aSIgg'}},b64('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24'),{pair,salt:b64('DGv6ra1nlYgDCS1FRnbzlw')});
 assert.equal(base64url(result.slice(86)),'8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ');
 assert.equal(new DataView(result.buffer).getUint32(16),4096);assert.equal(result[20],65);
});
test('fresh encrypted payload decrypts with independent Node HKDF/ECDH/AES APIs and VAPID signatures verify',async()=>{
 const ua=createECDH('prime256v1');ua.generateKeys();const auth=crypto.getRandomValues(new Uint8Array(16));
 const sub={endpoint,keys:{p256dh:base64url(ua.getPublicKey()),auth:base64url(auth)}};
 const keys=await createVapidKeys(),payload={title:'Last Minute Bites',body:'Synthetic reminder'},now=Date.UTC(2026,10,8,1);
 const request=await pushRequest(sub,payload,keys,'https://last-minute-bites-demo.jzalx789.workers.dev',now),data=Buffer.from(request.body);
 const salt=data.subarray(0,16),as=data.subarray(21,86),shared=ua.computeSecret(as);
 const ikm=Buffer.from(hkdfSync('sha256',shared,auth,Buffer.concat([Buffer.from('WebPush: info\0'),ua.getPublicKey(),as]),32));
 const cek=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16)),nonce=Buffer.from(hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12));
 const cipher=data.subarray(86),d=createDecipheriv('aes-128-gcm',cek,nonce);d.setAuthTag(cipher.subarray(-16));const clear=Buffer.concat([d.update(cipher.subarray(0,-16)),d.final()]);assert.equal(clear.at(-1),2);assert.deepEqual(JSON.parse(clear.subarray(0,-1)),payload);
 const token=request.headers.Authorization.match(/t=([^,]+)/)[1],parts=token.split('.');const claims=JSON.parse(b64(parts[1]));assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.exp,now/1000+21600);assert.equal(claims.sub,'https://last-minute-bites-demo.jzalx789.workers.dev');
 const pub={...keys.privateJwk};delete pub.d;assert(verify('sha256',Buffer.from(parts.slice(0,2).join('.')),{key:createPublicKey({key:pub,format:'jwk'}),dsaEncoding:'ieee-p1363'},b64(parts[2])));
 assert.notDeepEqual(await encryptPush(sub,JSON.stringify(payload)),request.body);
});
test('only browser push-service endpoints and valid curve/auth keys can be stored',async()=>{
 for(const url of ['http://fcm.googleapis.com/fcm/send/x','https://127.0.0.1/a','https://example.test/a','https://fcm.googleapis.com.evil.test/fcm/send/x','https://user@fcm.googleapis.com/fcm/send/x','https://fcm.googleapis.com:8443/fcm/send/x','https://fcm.googleapis.com/admin'])assert.throws(()=>pushEndpoint(url),/invalid_subscription/);
 assert.equal(pushEndpoint(endpoint),endpoint);assert.equal(pushEndpoint('https://web.push.apple.com/Qsynthetic-token'),'https://web.push.apple.com/Qsynthetic-token');
 await assert.rejects(validateSubscription({endpoint,keys:{p256dh:'bad',auth:'bad'}}));
 const pair=createECDH('prime256v1');pair.generateKeys();assert.equal((await validateSubscription({endpoint,keys:{p256dh:base64url(pair.getPublicKey()),auth:base64url(new Uint8Array(16))}})).endpoint,endpoint);
});
test('reminders use account-local dates, only active dated food and the configured lead window',()=>{
 const p={timezone:'Asia/Hong_Kong',reminders:true,reminder_days:3},when=Date.UTC(2026,10,8,1),foods=[{status:'active',quantity:1,effective_date:'2026-11-08'},{status:'active',quantity:1,date_source:'personal',effective_date:'2026-11-10'},{status:'active',effective_date:null},{status:'used',effective_date:'2026-11-09'},{status:'active',effective_date:'2026-11-07'},{status:'active',effective_date:'2026-11-15'},{status:'active',food_warning:'not_food',effective_date:'2026-11-09'}];
 const plan=reminderPlan(foods,p,when);assert.equal(plan.day,'2026-11-08');assert(plan.inWindow);assert.equal(plan.due.length,2);assert.equal(reminderPlan(foods,{...p,reminders:false},when).inWindow,false);assert.equal(reminderPlan(foods,p,when+3600000).inWindow,false);assert.equal(reminderPlan(foods,{...p,timezone:'UTC'},when).inWindow,false);
});
test('delivery never follows push-provider redirects and honours Retry-After without exposing responses',async t=>{
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.redirect,'error');assert.equal(url,endpoint);return new Response('no provider body is returned',{status:429,headers:{'Retry-After':'900'}});});
 assert.deepEqual(await deliverPush({endpoint,headers:{},body:new Uint8Array([1])}),{status:429,retryAfter:900});
});
