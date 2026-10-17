export const COUNTRIES = Object.freeze([
  { code: 'JP', name: '日本', en: 'JAPAN', emoji: '🌸' },
  { code: 'IT', name: '意大利', en: 'ITALY', emoji: '☕' },
  { code: 'FR', name: '法国', en: 'FRANCE', emoji: '🎨' },
  { code: 'IS', name: '冰岛', en: 'ICELAND', emoji: '🌌' },
  { code: 'NZ', name: '新西兰', en: 'NEW ZEALAND', emoji: '🌿' },
  { code: 'CH', name: '瑞士', en: 'SWITZERLAND', emoji: '🏔️' }
]);

export function normalizeChance(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(5, Math.min(95, Math.round(number))) : 70;
}

// A weighted lottery. Photo pixels and personal traits never enter this function.
export function drawCountry(japanChance = 70, random = Math.random) {
  const chance = normalizeChance(japanChance) / 100;
  const r = random();
  if (!(r >= 0 && r < 1)) throw new RangeError('Random source must return a number in [0, 1).');
  if (r < chance) return COUNTRIES[0];
  const index = Math.min(COUNTRIES.length - 2, Math.floor((r - chance) / (1 - chance) * (COUNTRIES.length - 1)));
  return COUNTRIES[index + 1];
}

export function randomUnit() {
  if (globalThis.crypto?.getRandomValues) {
    const data = new Uint32Array(1);
    globalThis.crypto.getRandomValues(data);
    return data[0] / 4294967296;
  }
  return Math.random();
}

export function cleanNickname(value) {
  return Array.from(String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim()).slice(0, 16).join('') || '照片持有人';
}

export function createRecord(name, chance, country, random = randomUnit, now = new Date()) {
  return Object.freeze({
    name: cleanNickname(name),
    country,
    chance: normalizeChance(chance),
    serial: 'FUN-' + now.getTime().toString(36).toUpperCase() + '-' + Math.floor(random() * 1679616).toString(36).toUpperCase().padStart(4, '0'),
    date: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replaceAll('/', '.'),
    disclaimer: '娱乐随机结果 · 不代表真实国籍'
  });
}
