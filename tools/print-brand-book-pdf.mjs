// Usage: node tools/print-brand-book-pdf.mjs <file:// url of the built book> <output.pdf>
// Print a page to PDF through the Chrome DevTools Protocol, honoring the CSS @page size.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [,, url, out] = process.argv;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', '--user-data-dir=/tmp/claude-print-profile', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 40; i++) { try { targets = await (await fetch('http://127.0.0.1:9333/json')).json(); if (targets.length) break; } catch {} await sleep(250); }
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 2036, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { media: process.env.MEDIA || 'print' }); await send('Page.navigate', { url });
await sleep(+(process.env.WAIT||9000));
const res = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: false, paperWidth: 15, paperHeight: 21.2, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
writeFileSync(out, Buffer.from(res.result.data, 'base64'));
console.log('wrote', out);
ws.close(); chrome.kill();
