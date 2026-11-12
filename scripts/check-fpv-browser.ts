import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';
const page = await launch(1440, 960, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const out = 'artifacts/fpv'; mkdirSync(out, {recursive:true});
async function click(selector: string, text?: string) {
  await waitFor(page, `[...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>!${JSON.stringify(text)}||e.textContent.trim()===${JSON.stringify(text)}||e.textContent.trim()===${JSON.stringify(text+'→')})`,10000,'button '+text);
  const point=await page.evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>!${JSON.stringify(text)}||e.textContent.trim()===${JSON.stringify(text)}||e.textContent.trim()===${JSON.stringify(text+'→')});if(!e)throw Error('Missing '+${JSON.stringify(selector)});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function key(code:string, down:boolean) { await page.send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',code,key:code==='Space'?' ':code==='ControlLeft'?'Control':code.replace('Key','').toLowerCase(),windowsVirtualKeyCode:code==='Space'?32:code==='ControlLeft'?17:code.charCodeAt(3)}); }
async function tap(code:string) { await key(code,true);await key(code,false); }
async function shot(name:string) { const shot=await page.send('Page.captureScreenshot',{format:'png'});writeFileSync(`${out}/${name}.png`,Buffer.from(shot.data,'base64')); }
async function waitSeconds(seconds:number) { const start=await page.evaluate(`window.__missionTest.fpv().elapsed`);await waitFor(page,`!window.__missionTest.fpv().active || window.__missionTest.fpv().elapsed>${start+seconds}`,30000,'flight simulation time'); }
try {
 await page.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__fpvErrors=[];addEventListener('error',e=>window.__fpvErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__fpvErrors.push(String(e.reason)));`});
 await page.send('Page.navigate',{url:process.env.FPV_URL??'http://127.0.0.1:18765/'});
 await page.evaluate(`localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{language:'tr',quality:'low',volume:.7,sensitivity:1,invertY:false},missions:{}}))`);
 await page.send('Page.reload');
 await waitFor(page,`document.querySelector('.main-navigation') && document.querySelector('#status').hidden && window.__missionTest`,120000,'menu ready');
 if(process.env.FPV_SKIP_LOADING==='1') await page.evaluate(`document.querySelector('#loading-screen')?.remove()`);
 await click('#shell-root button','Görevler'); await click('#shell-root button','Başla'); await waitFor(page,`!!document.querySelector('.briefing-body')`,5000,'briefing'); await click('#shell-root button','Başla');
 await waitFor(page,`document.body.classList.contains('shell-playing') && window.__missionTest?.snapshot()?.state==='active' && !document.querySelector('.fpv-dock').hidden`,120000,'playing');
 await shot('tank-controls');
 // The mission enters pointer lock, so launch through the real keyboard binding.
 await tap('KeyV');
 await waitFor(page,`window.__missionTest.fpv().active && document.pointerLockElement`,5000,'launch and pointer lock');
 await waitSeconds(.5);
 assert.equal(await page.evaluate(`window.__missionTest.camera().active`),'fpv-camera');
 const initial=await page.evaluate(`window.__missionTest.fpv()`);
 await key('Space',true); await waitSeconds(1); await key('Space',false);
 await key('KeyW',true); await waitSeconds(1); await key('KeyW',false);
 const moved=await page.evaluate(`window.__missionTest.fpv()`);
 assert.ok(moved.position[1]>initial.position[1]+2,'lift works'); assert.ok(moved.position[2]>initial.position[2]+3,'forward works');
 for(const code of ['KeyR','Digit1','Digit2','Digit0','KeyB','KeyV'])await tap(code);
 assert.equal(await page.evaluate(`window.__missionTest.camera().active`),'fpv-camera');
 assert.equal(await page.evaluate(`window.__missionTest.fpv().mode`),'ASSIST');
 await shot('assist-flight');
 // The same swept ray / impact path as enemy projectiles hits the real Havok trigger.
 assert.equal(await page.evaluate(`window.__missionTest.shootFpv()`),true,'projectile ray hits live drone body');
 await waitFor(page,`!window.__missionTest.fpv().active`,10000,'projectile destroys drone');
 assert.equal(await page.evaluate(`window.__missionTest.snapshot().state`),'active');
 assert.equal(await page.evaluate(`window.__missionTest.camera().active`),'tank-follow');
 await tap('KeyB'); await tap('KeyV');
 await waitFor(page,`window.__missionTest.fpv().active`,5000,'acro launch');
 assert.equal(await page.evaluate(`window.__missionTest.fpv().mode`),'ACRO');
 await key('Space',true);await waitSeconds(.8);await key('Space',false);
 await key('KeyW',true);await waitSeconds(.25);await key('KeyW',false);
 await shot('acro-flight');
 assert.equal(await page.evaluate(`window.__missionTest.shootFpv()`),true,'projectile ray hits live drone body');
 await waitFor(page,`!window.__missionTest.fpv().active`,10000,'acro projectile hit');
 await tap('KeyB');await tap('KeyV');await waitSeconds(.3);
 await key('Space',true);await waitSeconds(1);await key('Space',false);
 await key('KeyW',true);await waitSeconds(.6);await key('KeyW',false);
 await page.evaluate(`window.__missionTest.destroyTankForFpv()`);await waitSeconds(.5);
 assert.equal(await page.evaluate(`window.__missionTest.snapshot().state`),'active','tank destruction must defer defeat');
 assert.equal(await page.evaluate(`window.__missionTest.fpv().active`),true);
 await shot('last-flight');
 // Physically descend into terrain: no explicit early-return/testing shortcut.
 await key('ControlLeft',true);
 await waitFor(page,`!window.__missionTest.fpv().active`,30000,'terrain impact');await key('ControlLeft',false);
 await waitFor(page,`window.__missionTest.snapshot().state==='defeat'`,5000,'deferred defeat');
 assert.equal(await page.evaluate(`window.__missionTest.camera().active`),'tank-follow');
 assert.equal(await page.evaluate(`document.body.classList.contains('fpv-active')`),false);
 await shot('flight-ended');
 assert.deepEqual(await page.evaluate(`window.__fpvErrors`),[]);
 writeFileSync(`${out}/report.json`,JSON.stringify({loadingOverlayBypassed:process.env.FPV_SKIP_LOADING==='1',browser:'Headless Chromium / ANGLE SwiftShader',viewport:await page.evaluate(`innerWidth+'x'+innerHeight`),quality:'low',checks:['real launch','pointer lock','assist lift and forward','no reset / weapon / free-camera / mode escape','last flight survives tank destruction','terrain impact ends flight','enemy projectile shootdown','ACRO keyboard flight and return','deferred defeat and tank camera','no page errors'],initial,moved},null,2));
 console.log('FPV BROWSER PASS');
} catch (error) { await shot('failure'); console.error(await page.evaluate(`document.querySelector('#shell-root')?.innerText`)); throw error; } finally {await page.close();}
