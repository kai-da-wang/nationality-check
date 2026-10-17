import { COUNTRIES, drawCountry } from './lottery.js';
import { getVerdict } from './verdicts.js?v=9';

export const STORAGE_KEY = 'parallel-passport-play-v1';

const MAX_DRAWS = 1_000_000;
const COUNTRY_CODES = new Set(COUNTRIES.map(country => country.code));
const SITE_URL = 'https://parallel-passport-kai.imjusttrying341.chatgpt.site';
const shanghaiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function dayKey(now = new Date()) {
  const parts = Object.fromEntries(shanghaiDate.formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function emptyProgress() {
  return { version: 1, travelerId: '', collected: [], totalDraws: 0, daily: null };
}

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cleanProgress(value) {
  const clean = emptyProgress();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return clean;
  if (typeof value.travelerId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value.travelerId)) {
    clean.travelerId = value.travelerId;
  }
  if (Array.isArray(value.collected)) {
    clean.collected = [...new Set(value.collected.filter(code => typeof code === 'string' && COUNTRY_CODES.has(code)))];
  }
  if (typeof value.totalDraws === 'number' && Number.isFinite(value.totalDraws)) {
    clean.totalDraws = Math.min(MAX_DRAWS, Math.max(0, Math.floor(value.totalDraws)));
  }
  const daily = value.daily;
  if (daily && typeof daily === 'object' && !Array.isArray(daily)
      && validDay(daily.day) && COUNTRY_CODES.has(daily.countryCode)
      && typeof daily.serial === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(daily.serial)
      && daily.date === daily.day.replaceAll('-', '.')) {
    clean.daily = { day: daily.day, countryCode: daily.countryCode, serial: daily.serial, date: daily.date };
  }
  return clean;
}

export function parseProgress(raw) {
  if (typeof raw !== 'string' || raw.length > 100_000) return emptyProgress();
  try {
    return cleanProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

// A device ID and Shanghai calendar day form the seed. No personal data enters the draw.
export function dailyCountry(day, travelerId) {
  const input = `${String(day)}\u0000${String(travelerId)}`;
  let seed = 2166136261;
  for (let i = 0; i < input.length; i++) {
    seed = Math.imul(seed ^ input.charCodeAt(i), 16777619);
  }
  const seeded = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return drawCountry(70, seeded);
}

export function addToPassport(progress, record) {
  const next = cleanProgress(progress);
  const code = record?.country?.code;
  if (!COUNTRY_CODES.has(code)) return next;
  if (!next.collected.includes(code)) next.collected.push(code);
  next.totalDraws = Math.min(MAX_DRAWS, next.totalDraws + 1);
  return next;
}

export function shareText(record, mode = 'free') {
  const country = COUNTRIES.find(item => item.code === record?.country?.code);
  const destination = country ? `${country.name} ${country.emoji}` : '神秘目的地';
  const opening = mode === 'daily' ? `我的今日旅行签是：${destination}。` : `我抽到的平行宇宙目的地是：${destination}。`;
  const verdict = getVerdict(record?.verdict?.id);
  const judgment = verdict ? `\n本官判词：${verdict.title}。${verdict.line}` : '';
  return `${opening}${judgment}\n你会抽到什么判词？\n娱乐随机结果 · 不代表真实国籍\n${SITE_URL}`;
}
