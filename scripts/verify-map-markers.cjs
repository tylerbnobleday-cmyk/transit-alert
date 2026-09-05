const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const profile = path.join(os.tmpdir(), `transitalert-map-qa-${process.pid}`);
const screenshotPath = path.join(process.cwd(), 'map-marker-qa.png');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitJson(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch {}
    await delay(250);
  }
  throw new Error('Edge debugging endpoint did not start.');
}

function createClient(socket) {
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  return (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}

(async () => {
  const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9231', `--user-data-dir=${profile}`, '--window-size=1440,900', 'http://127.0.0.1:3200/'], { windowsHide: true });
  try {
    const targets = await waitJson('http://127.0.0.1:9231/json');
    const page = targets.find(target => target.type === 'page');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    const send = createClient(socket);
    await send('Page.enable');
    await send('Runtime.enable');
    await delay(2500);
    await send('Runtime.evaluate', {
      expression: `(() => { const guest=[...document.querySelectorAll('button,a')].find(node=>/guest|skip|continue without/i.test(node.textContent||'')); if(guest){guest.click();return true} return false })()`,
      returnByValue: true,
    });
    await delay(8000);
    await send('Runtime.evaluate', {
      expression: `(() => { const close=[...document.querySelectorAll('button')].find(node=>(node.textContent||'').trim()==='Close'); if(close){close.click();return true} return false })()`,
      returnByValue: true,
    });
    await delay(500);
    const result = await send('Runtime.evaluate', {
      expression: `JSON.stringify({title:document.title,trainMarkers:document.querySelectorAll('.live-train-marker').length,busMarkers:document.querySelectorAll('.live-bus-marker').length,leafletMarkers:document.querySelectorAll('.leaflet-marker-icon').length,bodyText:document.body.innerText.slice(0,500)})`,
      returnByValue: true,
    });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'));
    socket.close();
    console.log(JSON.stringify({ ok: true, ...JSON.parse(result.result.value), screenshotPath }));
  } finally {
    browser.kill();
    await delay(600);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
