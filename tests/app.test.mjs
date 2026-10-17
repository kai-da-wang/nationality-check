import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, createRecord } from '../dist/lottery.js';
import { drawCertificate } from '../dist/certificate.js';

const require = createRequire(import.meta.url);
const { createCanvas, GlobalFonts, Image: NativeImage } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath(fileURLToPath(new URL('../dist/fonts/parallel-sans.woff2', import.meta.url)), 'Parallel Sans');
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');

test('certificate renders a valid full-size PNG and preserves the uploaded illustration', () => {
  const canvas = createCanvas(1, 1);
  canvas.getContext('2d').font = '30px \"Parallel Sans\"';
  assert.equal(canvas.getContext('2d').measureText('日本').width, 60, 'Chinese font is present');
  const photo = createCanvas(400, 300);
  photo.getContext('2d').fillStyle = '#d84488';
  photo.getContext('2d').fillRect(0, 0, 400, 300);
  drawCertificate(canvas, createRecord('🐱'.repeat(16), 95, COUNTRIES[0]), photo);
  assert.equal(canvas.width, 1200);
  assert.equal(canvas.height, 1600);
  assert.deepEqual(Array.from(canvas.getContext('2d').getImageData(140, 430, 1, 1).data), [216, 68, 136, 255]);
  const png = canvas.toBuffer('image/png');
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert(png.length > 10000);
});

// A minimal DOM adapter exercises app behavior without installing a browser.
function element(tag = 'div') {
  const target = tag === 'canvas' ? createCanvas(1, 1) : {};
  target.tagName = tag.toUpperCase();
  target.listeners = new Map();
  target.attributes = new Map();
  target.classes = new Set();
  target.style = {};
  target.hidden = false;
  target.disabled = false;
  target.value = '';
  target.children = [];
  target.classList = {
    add: x => target.classes.add(x), remove: x => target.classes.delete(x),
    toggle: (x, enabled) => enabled ? target.classes.add(x) : target.classes.delete(x)
  };
  target.setAttribute = (k, v) => target.attributes.set(k, v);
  target.getAttribute = k => target.attributes.get(k);
  target.removeAttribute = k => { target.attributes.delete(k); delete target[k]; };
  target.addEventListener = (name, fn) => target.listeners.set(name, [...(target.listeners.get(name) || []), fn]);
  target.dispatch = async (name, event = {}) => { for (const fn of target.listeners.get(name) || []) await fn({ preventDefault() {}, target, ...event }); };
  target.focus = () => { target.focused = true; if (globalThis.document) document.activeElement = target; };
  target.scrollIntoView = () => {};
  target.appendChild = child => { target.children.push(child); return child; };
  target.replaceChildren = (...children) => { target.children = children; };
  target.remove = () => {};
  target.click = () => { target.clicked = true; };
  if (tag === 'canvas') target.toBlob = cb => queueMicrotask(() => cb(new Blob([target.toBuffer('image/png')], { type: 'image/png' })));
  return target;
}

test('mobile two-screen flow auto-generates on upload, exports, edits, returns, and cancels safely', async () => {
  const nodes = new Map();
  for (const m of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
    const item = element(m[1]);
    item.hidden = /(?:^|\s)hidden(?:\s|=|$)/.test(m[2]);
    item.disabled = /(?:^|\s)disabled(?:\s|=|$)/.test(m[2]);
    nodes.set(m[3], item);
  }
  nodes.get('japanChance').value = '70';
  const body = element('body'), doc = element('document'), win = element('window');
  const createdAnchors = [];
  doc.getElementById = id => { assert(nodes.has(id), `Missing DOM id: ${id}`); return nodes.get(id); };
  doc.body = body;
  doc.createElement = tag => { const item = element(tag); if (tag === 'a') createdAnchors.push(item); return item; };
  win.matchMedia = query => ({ matches: query.includes('prefers-reduced-motion') });
  win.location = new URL('https://example.test/');
  const navigate = (_, __, path) => { win.location = new URL(path, win.location.href); };
  win.history = { replaceState: navigate, pushState: navigate };
  win.scrollTo = () => {};
  let printCount = 0;
  win.print = () => printCount++;
  globalThis.document = doc;
  globalThis.window = win;
  globalThis.Image = function LocalImage() {
    const image = new NativeImage();
    const descriptor = Object.getOwnPropertyDescriptor(NativeImage.prototype, 'src');
    Object.defineProperty(image, 'src', {
      get: () => descriptor.get.call(image),
      set: value => { fetch(value).then(r => r.arrayBuffer()).then(data => descriptor.set.call(image, Buffer.from(data))).catch(error => image.onerror?.(error)); }
    });
    return image;
  };
  await import('../dist/app.js?mobile-v2-test');
  const get = id => nodes.get(id);
  assert.equal(get('uploadScreen').hidden, false);
  assert.equal(get('certificateScreen').hidden, true);
  assert.equal(get('savePng').disabled, true);
  await get('demoButton').dispatch('click');
  assert.equal(get('uploadScreen').hidden, true);
  assert.equal(get('certificateScreen').hidden, false);
  assert.equal(win.location.hash, '#certificate');
  assert.equal(get('generationOverlay').hidden, true);
  assert.equal(get('savePng').disabled, false);
  assert.equal(get('resultHeading').textContent, '本局结论已出');
  const firstUrl = get('printImage').src;
  const firstBlob = await fetch(firstUrl).then(r => r.blob());
  assert.equal(firstBlob.type, 'image/png');
  assert(firstBlob.size > 10000);

  await get('settingsToggle').dispatch('click');
  assert.equal(get('settingsPanel').hidden, false);
  assert.equal(body.style.overflow, 'hidden');
  get('nickname').value = '<script>坏名字</script>';
  await get('nickname').dispatch('input');
  assert.match(get('certificate').getAttribute('aria-label'), /<script>/);
  assert.equal(get('savePng').disabled, false);
  assert.notEqual(get('printImage').src, firstUrl);
  await get('settingsDone').dispatch('click');
  assert.equal(get('settingsPanel').hidden, true);
  assert.equal(body.style.overflow, '');
  await get('savePng').dispatch('click');
  assert.match(createdAnchors.at(-1).download, /^国籍鉴定_.*\.png$/);
  assert.equal(createdAnchors.at(-1).clicked, true);
  assert.equal(get('mobileSave').hidden, false);

  get('japanChance').value = '95';
  await get('japanChance').dispatch('input');
  assert.match(get('message').textContent, /下一次抽签/);
  await get('generate').dispatch('click');
  assert.equal(get('savePng').disabled, false);
  await get('settingsToggle').dispatch('click');
  await get('printCertificate').dispatch('click');
  assert.equal(printCount, 1);
  await get('backToUpload').dispatch('click');
  assert.equal(get('uploadScreen').hidden, false);
  assert.equal(get('certificateScreen').hidden, true);
  assert.equal(get('settingsPanel').hidden, true);
  assert.equal(win.location.hash, '');
  assert.equal(get('savePng').disabled, true);

  const invalid = new Blob(['not an image']); invalid.name = 'fake.jpg';
  await get('photo').dispatch('change', { target: { files: [invalid] } });
  assert.match(get('uploadMessage').textContent, /请选择 JPG/);
  assert.equal(get('uploadScreen').hidden, false);
  const uploadedCanvas = createCanvas(2400, 1600);
  uploadedCanvas.getContext('2d').fillStyle = '#d84488';
  uploadedCanvas.getContext('2d').fillRect(0, 0, 2400, 1600);
  const valid = new Blob([uploadedCanvas.toBuffer('image/png')], { type: 'image/png' }); valid.name = '照片.png';
  await get('photo').dispatch('change', { target: { files: [valid] } });
  assert.equal(get('certificateScreen').hidden, false);
  assert.equal(get('savePng').disabled, false);
  assert.equal(get('photoName').textContent, '照片.png');
  assert.match(get('photoPreview').src, /^data:image\/jpeg/);
  assert.deepEqual(Array.from(get('certificate').getContext('2d').getImageData(140, 430, 1, 1).data), [216, 68, 136, 255]);
  win.location.hash = '';
  await win.dispatch('popstate');
  assert.equal(get('certificateScreen').hidden, true);
  assert.equal(get('savePng').disabled, true);
  assert(!body.classes.has('has-certificate'));

  const inProgress = get('demoButton').dispatch('click');
  await new Promise(resolve => setImmediate(resolve));
  await get('backToUpload').dispatch('click');
  await inProgress;
  assert.equal(get('uploadScreen').hidden, false);
  assert.equal(get('certificateScreen').hidden, true);
  assert.equal(get('savePng').disabled, true);
  assert.equal(get('generationOverlay').hidden, true);
  delete globalThis.document; delete globalThis.window; delete globalThis.Image;
});
