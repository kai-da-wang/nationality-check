import { COUNTRIES, drawCountry, randomUnit, cleanNickname, createRecord } from './lottery.js?v=8';
import { drawCertificate } from './certificate.js?v=8';
import { STORAGE_KEY, dayKey, emptyProgress, parseProgress, dailyCountry, addToPassport, shareText } from './game.js?v=9';
import { drawVerdict } from './verdicts.js?v=9';

const $ = id => document.getElementById(id);
const BASE_TITLE = '国籍鉴定 · 随机娱乐测试';
let photo = null, record = null, pngUrl = null;
let selectionVersion = 0, generationVersion = 0, exportVersion = 0;
let generating = false, loading = false;
let sharing = false, shareVersion = 0, shareToastTimer;
let mode = 'free', recordMode = 'free', pngBlob = null, progress = emptyProgress(), lastVerdictId = '';
let storageAvailable = true;
try { progress = parseProgress(window.localStorage.getItem(STORAGE_KEY)); } catch { storageAvailable = false; }
if (!progress.travelerId) progress.travelerId = Array.from({ length: 3 }, () => Math.floor(randomUnit() * 4294967296).toString(36)).join('-');
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fontReady = document.fonts?.load ? document.fonts.load('400 24px "Parallel Sans"', '国籍鉴定日本人本官已阅结果随机生成仅供娱乐').catch(() => []) : Promise.resolve();

function saveProgress() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); storageAvailable = true; }
  catch { storageAvailable = false; }
  $('storageNotice').hidden = storageAvailable;
}
function renderHomeCollection() {
  const count = progress.collected.length;
  $('homeCollection').textContent = `${count} / ${COUNTRIES.length} 已解锁`;
  $('storageNotice').hidden = storageAvailable;
}
function renderMode() {
  $('freeMode').setAttribute('aria-pressed', String(mode === 'free'));
  $('dailyMode').setAttribute('aria-pressed', String(mode === 'daily'));
  $('modeHelp').textContent = mode === 'daily' ? '本机当天身份固定，上海时间零点更新。日本 70%，其余各 6%。' : `想抽就抽。当前日本 ${$('japanChance').value}%，其余五国均分剩余概率。`;
  if (mode === 'daily' && !storageAvailable) $('modeHelp').textContent = '本次页面内当天身份固定；浏览器未允许保存，刷新可能改变。';
  $('generateLabel').textContent = generating ? '审理中' : mode === 'daily' ? '去自由抽签' : '申请重审';
  $('japanChance').disabled = mode === 'daily';
}
function setMode(next) {
  if (generating || loading) return;
  mode = next; renderMode();
}

function say(text = '', error = false) {
  for (const id of ['message', 'uploadMessage', 'settingsStatus']) {
    $(id).textContent = text;
    $(id).classList.toggle('error', error);
  }
}
function closeSettings(focus = true) {
  $('settingsPanel').hidden = true;
  $('settingsToggle').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  if (focus && !$('certificateScreen').hidden) $('settingsToggle').focus();
}
function showScreen(screen, replace = false) {
  closeSettings(false);
  const isCertificate = screen === 'certificate' && photo;
  $('uploadScreen').hidden = !!isCertificate;
  $('certificateScreen').hidden = !isCertificate;
  const path = window.location.pathname + window.location.search + (isCertificate ? '#certificate' : '');
  if (replace) window.history.replaceState({ screen }, '', path);
  else if (window.location.hash !== (isCertificate ? '#certificate' : '')) window.history.pushState({ screen }, '', path);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  $(isCertificate ? 'resultHeading' : 'uploadTitle').focus({ preventScroll: true });
}
function updateControls() {
  const busy = loading || generating;
  $('photo').disabled = busy;
  $('demoButton').disabled = busy;
  $('generate').disabled = !photo || busy;
  $('generateLabel').textContent = generating ? '审理中' : '申请重审';
  $('settingsToggle').disabled = busy;
  $('formFields').disabled = busy;
  $('freeMode').disabled = busy;
  $('dailyMode').disabled = busy;
  $('inviteFriend').disabled = busy || sharing;
  $('inviteFriend').textContent = sharing ? '正在准备分享…' : '邀请朋友也来抽 →';
  $('shareResult').disabled = busy || sharing || !pngBlob;
  $('uploadLabel').textContent = loading ? '正在本机准备照片…' : '上传一张照片';
  $('uploadCta').setAttribute('aria-disabled', String(busy));
  renderMode();
}
function resetExport() {
  shareVersion++; sharing = false;
  clearTimeout(shareToastTimer);
  $('shareStatus').hidden = true;
  $('shareToast').hidden = true;
  exportVersion++;
  if (pngUrl) URL.revokeObjectURL(pngUrl);
  pngUrl = null;
  pngBlob = null;
  $('shareResult').disabled = true;
  $('shareFallback').hidden = true;
  $('savePng').disabled = true;
  $('printCertificate').disabled = true;
  $('mobileSave').hidden = true;
  $('openPng').removeAttribute('href');
  $('printImage').removeAttribute('src');
  document.body.classList.remove('has-certificate');
}
async function rebuildExport() {
  const version = ++exportVersion, current = record;
  $('savePng').disabled = true;
  $('printCertificate').disabled = true;
  $('shareResult').disabled = true;
  pngBlob = null;
  try {
    const blob = await new Promise((resolve, reject) => $('certificate').toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败，请再抽一次。')), 'image/png'));
    if (version !== exportVersion || current !== record || !record) return;
    if (pngUrl) URL.revokeObjectURL(pngUrl);
    pngUrl = URL.createObjectURL(blob);
    pngBlob = blob;
    $('openPng').href = pngUrl;
    $('printImage').src = pngUrl;
    $('savePng').disabled = false;
    $('printCertificate').disabled = false;
    $('shareResult').disabled = false;
    document.body.classList.add('has-certificate');
  } catch (error) { if (version === exportVersion) say(error.message || '图片导出失败，请重新生成。', true); }
}
async function showResult() {
  const current = record;
  await fontReady;
  if (!current || current !== record) return;
  drawCertificate($('certificate'), current, photo);
  $('certificate').setAttribute('aria-label', `${current.name}的角色纪念证书。本次随机角色为${current.country.name}人。娱乐随机结果，不代表真实国籍。`);
  $('resultHeading').textContent = '本局结论已出';
  $('roleStory').hidden = false;
  $('roleTitle').textContent = current.verdict.title;
  $('roleLine').textContent = current.verdict.line;
  $('rolePerk').textContent = current.verdict.perk;
  $('resultRule').textContent = recordMode === 'daily' ? (storageAvailable ? '每日签使用默认概率，本机当天身份固定；不根据照片判断。' : '未能保存进度：今日签仅在本次页面内固定，刷新可能改变。') : `本局日本 ${current.chance}%，其余五国均分剩余概率；不根据照片判断。`;
  renderHomeCollection();
  await rebuildExport();
}
function clearPhoto(replace = true) {
  selectionVersion++; generationVersion++;
  generating = false; loading = false; photo = null; record = null;
  $('photo').value = '';
  $('photoPreview').removeAttribute('src');
  resetExport();
  $('generationOverlay').hidden = true;
  $('roleStory').hidden = true;
  $('certificateStage').classList.remove('busy');
  showScreen('upload', replace);
  updateControls();
  say('');
}
async function validateImage(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error('照片超过 15 MB，请先压缩后再选择。');
  if (!file.size) throw new Error('文件是空的，请换一张照片。');
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => b[i] === n);
  const webp = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  if (!jpg && !png && !webp) throw new Error('请选择 JPG、PNG 或 WebP 图片。HEIC / GIF 请先转换成 JPG。');
}
async function acceptPhoto(canvas, name) {
  photo = canvas; record = null; resetExport();
  $('photoPreview').src = canvas.toDataURL('image/jpeg', .88);
  $('photoName').textContent = name;
  $('resultHeading').textContent = '本官正在酝酿结论';
  showScreen('certificate');
  await generate();
}
async function loadPhoto(file) {
  if (!file || generating || loading) return;
  const version = ++selectionVersion;
  let objectUrl, normalized;
  loading = true; updateControls(); say('照片仅在本机处理…');
  try {
    await validateImage(file);
    if (version !== selectionVersion) return;
    objectUrl = URL.createObjectURL(file);
    const source = new Image();
    await new Promise((resolve, reject) => {
      source.onload = resolve;
      source.onerror = () => reject(new Error('无法读取照片，请换一张 JPG / PNG 图片。'));
      source.src = objectUrl;
    });
    if (version !== selectionVersion) return;
    if (!source.naturalWidth || source.naturalWidth * source.naturalHeight > 48000000) throw new Error('图片尺寸过大，请压缩到 4800 万像素以内。');
    const ratio = Math.min(1, 1280 / Math.max(source.naturalWidth, source.naturalHeight));
    normalized = document.createElement('canvas');
    normalized.width = Math.max(1, Math.round(source.naturalWidth * ratio));
    normalized.height = Math.max(1, Math.round(source.naturalHeight * ratio));
    const context = normalized.getContext('2d');
    if (!context) throw new Error('当前浏览器无法处理图片，请更换浏览器。');
    context.fillStyle = '#faf7ef'; context.fillRect(0, 0, normalized.width, normalized.height);
    context.drawImage(source, 0, 0, normalized.width, normalized.height);
  } catch (error) {
    normalized = null;
    if (version === selectionVersion) say(error.message || '照片读取失败，请重新选择。', true);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (version === selectionVersion) { loading = false; $('photo').value = ''; updateControls(); }
  }
  if (normalized && version === selectionVersion) await acceptPhoto(normalized, file.name || '本机照片');
}
async function useDemo() {
  if (generating || loading) return;
  const demo = document.createElement('canvas'); demo.width = 600; demo.height = 760;
  const c = demo.getContext('2d');
  if (!c) return say('当前浏览器无法处理图片，请更换浏览器。', true);
  c.fillStyle = '#e6e7de'; c.fillRect(0, 0, 600, 760);
  c.fillStyle = '#9da99a'; c.beginPath(); c.arc(300, 265, 98, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#374556'; c.beginPath(); c.ellipse(300, 581, 178, 197, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f8f7ef'; c.font = '23px sans-serif'; c.textAlign = 'center'; c.fillText('DEMO PORTRAIT', 300, 660);
  await acceptPhoto(demo, '示意头像');
}
async function generate(event) {
  event?.preventDefault?.();
  if (generating || loading || !photo) return;
  closeSettings(false);
  const run = ++generationVersion;
  generating = true; resetExport(); updateControls();
  $('roleStory').hidden = true;
  $('generationOverlay').hidden = false;
  $('certificateStage').classList.add('busy');
  $('resultHeading').textContent = '本官正在酝酿结论';
  drawCertificate($('certificate'), null, photo);
  say('随机抽签，与照片长相无关。');
  try {
    const phases = [['正在领取本局签号…', 25], ['本官正在酝酿结论…', 65], ['正在出具本局文书…', 95]];
    for (const [text, percent] of phases) {
      if (run !== generationVersion) return;
      $('progressText').textContent = text; $('progressPercent').textContent = percent + '%';
      $('progressFill').style.width = percent + '%'; $('progressBar').setAttribute('aria-valuenow', String(percent));
      await wait(reducedMotion() ? 20 : 260);
    }
    await fontReady;
    if (run !== generationVersion) return;
    const chance = mode === 'daily' ? 70 : Number($('japanChance').value);
    const drawTime = new Date(), today = dayKey(drawTime), previousDaily = progress.daily;
    const cachedDaily = mode === 'daily' && previousDaily?.day === today;
    const country = mode === 'daily' ? (cachedDaily ? COUNTRIES.find(c => c.code === previousDaily.countryCode) : dailyCountry(today, progress.travelerId)) : drawCountry(chance, randomUnit);
    const verdict = drawVerdict(lastVerdictId, randomUnit);
    record = Object.freeze({ ...createRecord($('nickname').value, chance, country, randomUnit, drawTime), verdict });
    lastVerdictId = verdict.id;
    recordMode = mode;
    if (mode === 'daily') record = Object.freeze({ ...record, dailyDay: today });
    if (cachedDaily) record = Object.freeze({ ...record, serial: previousDaily.serial, date: previousDaily.date });
    if (!cachedDaily) progress = addToPassport(progress, record);
    else if (!progress.collected.includes(country.code)) progress = { ...progress, collected: [...progress.collected, country.code] };
    if (mode === 'daily' && !cachedDaily) progress = { ...progress, daily: { day: today, countryCode: country.code, serial: record.serial, date: record.date } };
    saveProgress();
    await showResult();
    if (run !== generationVersion) return;
    $('progressBar').setAttribute('aria-valuenow', '100');
    say('');
  } catch (error) { if (run === generationVersion) say(error.message || '生成失败，请再抽一次。', true); }
  finally {
    if (run === generationVersion) {
      generating = false; $('generationOverlay').hidden = true; $('certificateStage').classList.remove('busy'); updateControls();
    }
  }
}
$('photo').addEventListener('change', e => loadPhoto(e.target.files?.[0]));
$('demoButton').addEventListener('click', useDemo);
$('generate').addEventListener('click', event => { if (mode === 'daily') setMode('free'); return generate(event); });
$('freeMode').addEventListener('click', () => setMode('free'));
$('dailyMode').addEventListener('click', () => setMode('daily'));
$('application').addEventListener('submit', generate);
$('backToUpload').addEventListener('click', () => clearPhoto());
$('removePhoto').addEventListener('click', () => clearPhoto());
$('uploadZone').addEventListener('dragover', e => { e.preventDefault(); if (!generating && !loading) $('uploadZone').classList.add('dragging'); });
$('uploadZone').addEventListener('dragleave', () => $('uploadZone').classList.remove('dragging'));
$('uploadZone').addEventListener('drop', e => { e.preventDefault(); $('uploadZone').classList.remove('dragging'); return loadPhoto(e.dataTransfer?.files?.[0]); });
for (const name of ['dragover', 'drop']) document.addEventListener(name, e => { if (Array.from(e.dataTransfer?.types || []).includes('Files')) e.preventDefault(); });
$('settingsToggle').addEventListener('click', () => {
  if (generating) return;
  $('settingsPanel').hidden = false; $('settingsToggle').setAttribute('aria-expanded', 'true');
  $('settingsStatus').textContent = mode === 'daily' ? '每日签固定使用默认概率。昵称可编辑，身份不会改变。' : '昵称会直接更新，概率在下次抽签时生效。';
  document.body.style.overflow = 'hidden'; $('settingsClose').focus();
});
for (const id of ['settingsClose', 'settingsDone']) $(id).addEventListener('click', () => closeSettings());
$('settingsPanel').addEventListener('click', e => { if (e.target === $('settingsPanel')) closeSettings(); });
document.addEventListener('keydown', e => {
  if ($('settingsPanel').hidden) return;
  if (e.key === 'Escape') closeSettings();
  if (e.key === 'Tab') {
    const first = $('settingsClose'), last = $('settingsDone');
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('oddsToggle').addEventListener('click', () => {
  const expanded = $('oddsToggle').getAttribute('aria-expanded') === 'true';
  $('oddsToggle').setAttribute('aria-expanded', String(!expanded)); $('oddsControls').hidden = expanded;
});
$('japanChance').addEventListener('input', () => {
  $('oddsBadge').textContent = $('japanChance').value + '%';
  renderMode();
  say('新概率在下一次抽签时生效，当前证书保持本次结果。');
});
$('nickname').addEventListener('input', async () => {
  $('nickname').value = Array.from($('nickname').value).slice(0, 16).join('');
  $('nameCount').textContent = `${Array.from($('nickname').value).length} / 16`;
  if (record) { record = Object.freeze({ ...record, name: cleanNickname($('nickname').value) }); await showResult(); }
});
$('savePng').addEventListener('click', () => {
  if (!pngUrl || !record) return;
  const link = document.createElement('a'); link.href = pngUrl;
  link.download = `国籍鉴定_${record.country.name}人_${record.serial}.png`;
  document.body.appendChild(link); link.click(); link.remove();
  $('mobileSave').hidden = false; say('已发起下载。未保存成功时，可打开高清图片后长按保存。');
});
$('printCertificate').addEventListener('click', async () => {
  if (!record || !pngUrl) return;
  try {
    if ($('printImage').decode) await $('printImage').decode();
    if (typeof window.print !== 'function') throw new Error('当前浏览器不支持打印，请先保存图片。');
    document.title = `国籍鉴定_${record.country.name}人_${record.serial}`;
    window.print();
  } catch (error) { say(error.message || '请先保存图片，再使用系统打印。', true); }
});
window.addEventListener('afterprint', () => { document.title = BASE_TITLE; });
window.addEventListener('popstate', () => {
  if (window.location.hash === '#certificate' && photo) showScreen('certificate', true);
  else clearPhoto(true);
});
function shareNotice(text, manual = false) {
  $('shareStatus').textContent = text;
  $('shareStatus').hidden = false;
  $('shareStatus').classList.toggle('manual', manual);
  $('shareToast').textContent = text;
  $('shareToast').hidden = false;
  clearTimeout(shareToastTimer);
  shareToastTimer = setTimeout(() => { $('shareToast').hidden = true; }, 5000);
}
async function copyOrShow(text, version) {
  let timeout;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('clipboard timed out')), 1500); })
    ]);
    if (version !== shareVersion) return;
    $('shareFallback').hidden = true;
    shareNotice('链接和文案已复制，去微信或聊天窗口粘贴给朋友。');
  } catch {
    if (version !== shareVersion) return;
    $('shareCopy').value = text; $('shareFallback').hidden = false;
    shareNotice('请长按下方文案复制，再发给朋友。', true);
    $('shareCopy').focus({ preventScroll: true }); $('shareCopy').select();
    $('shareFallback').scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  } finally { clearTimeout(timeout); }
}
function startSharing() {
  if (sharing || generating || loading) return null;
  sharing = true;
  const version = ++shareVersion;
  $('shareFallback').hidden = true;
  updateControls();
  shareNotice('正在准备分享…');
  return version;
}
function finishSharing(version) {
  if (version !== shareVersion) return;
  sharing = false; updateControls();
}
$('shareResult').addEventListener('click', async () => {
  if (!record || !pngBlob || generating) return;
  const version = startSharing();
  if (version === null) return;
  const text = shareText(record, recordMode);
  const file = typeof File === 'function' ? new File([pngBlob], `平行身份_${record.country.code}.png`, { type: 'image/png' }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ title: '本官给我的平行身份', text, files: [file] });
      if (version === shareVersion) shareNotice('分享操作已完成，可以邀请朋友也来抽。');
    } else await copyOrShow(text, version);
  } catch (error) {
    if (version !== shareVersion) return;
    if (error.name === 'AbortError') shareNotice('已取消分享，可以随时再试。');
    else await copyOrShow(text, version);
  } finally { finishSharing(version); }
});
$('inviteFriend').addEventListener('click', async () => {
  const version = startSharing();
  if (version === null) return;
  const url = 'https://parallel-passport-kai.imjusttrying341.chatgpt.site';
  const text = '本官今天给你什么平行身份？不用照片也能试玩，来抽一张。';
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: '邀请你来国籍鉴定', text, url });
      if (version === shareVersion) shareNotice('邀请分享操作已完成，等朋友也来抽。');
    } else await copyOrShow(`${text}\n${url}`, version);
  } catch (error) {
    if (version !== shareVersion) return;
    if (error.name === 'AbortError') shareNotice('已取消邀请，可以随时再试。');
    else await copyOrShow(`${text}\n${url}`, version);
  } finally { finishSharing(version); }
});
window.addEventListener('pagehide', () => { if (pngUrl) URL.revokeObjectURL(pngUrl); pngUrl = null; pngBlob = null; });
window.addEventListener('pageshow', e => { if (e.persisted && record) rebuildExport(); });
showScreen('upload', true);
saveProgress();
renderHomeCollection();
updateControls();
