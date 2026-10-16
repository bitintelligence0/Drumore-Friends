// Usage: node tools/capture-qa.mjs <absolute path of the built brand book html> <site url, e.g. http://127.0.0.1:8780> <output folder, e.g. docs/qa>
// Capture brand-book sections and the matching site views as PNGs for side-by-side QA.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [,, bookPath, site, outDir] = process.argv;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9334', '--user-data-dir=/tmp/claude-qa-profile', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9334/json')).json(); if (targets.length) break; } catch {} await sleep(250); }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
const evalJS = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

async function shot(name, url, { w = 1440, h = 1000, mobile = false, sel = null, js = null, wait = 3500, maxH = 1500 } = {}) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Page.navigate', { url });
  await sleep(wait);
  if (js) { await evalJS(js); await sleep(900); }
  let clip = { x: 0, y: 0, width: w, height: h, scale: 1 };
  if (sel) {
    const r = await evalJS(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView(); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
    if (r) clip = { ...r, height: Math.min(r.height, maxH), scale: 1 };
  }
  const res = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(res.result.data, 'base64'));
  console.log('captured', name);
}
const book = 'file://' + bookPath;
// timeline
await shot('book-timeline', book, { sel: '#pages .browser' });
await shot('site-timeline', site + '/?person=wynona-lamborn', { h: 1300, sel: '.explore', maxH: 1300 });
// family
await shot('book-family', book, { sel: '#tree .tree-wrap' });
await shot('site-family', site + '/?mode=family&person=wynona-lamborn', { h: 1300, sel: '.workbench', maxH: 1000 });
// map
await shot('book-map', book, { sel: '#map .mapwrap' });
await shot('site-map', site + '/?mode=map&person=wynona-lamborn', { h: 1100, sel: '#mapstrip' });
// person page
await shot('book-person', book, { sel: '#person .browser' });
await shot('site-person', site + '/?view=story&story=wynona-diary&scene=first-diary-page&event=E029&year=1890', { h: 1300, sel: '.pp', maxH: 1300 });
// phones
await shot('book-phones', book, { sel: '#sample .phones' });
await shot('site-phone-story', site + '/?view=story&story=wynona-diary&scene=first-diary-page&event=E029&year=1890', { w: 390, h: 844, mobile: true, js: 'try{sessionStorage.setItem("df-desktop-prompt","1")}catch(e){}' });
await shot('site-phone-timeline', site + '/?person=wynona-lamborn', { w: 390, h: 844, mobile: true, js: 'try{sessionStorage.setItem("df-desktop-prompt","1")}catch(e){}; scrollTo(0, 620)' });
await shot('site-phone-family', site + '/?mode=family', { w: 390, h: 844, mobile: true, js: 'try{sessionStorage.setItem("df-desktop-prompt","1")}catch(e){}' });
await shot('site-phone-source', site + '/?view=story&story=wynona-diary&scene=first-diary-page&post=P045&image=P045-I06', { w: 390, h: 844, mobile: true, js: 'try{sessionStorage.setItem("df-desktop-prompt","1")}catch(e){}; document.querySelector(".viewer-body").scrollTop = 520' });
ws.close(); chrome.kill();
