const INK = '#211736';
const PAPER = '#fff7df';
const FONT = '"Parallel Sans", "PingFang SC", "Microsoft YaHei", sans-serif';
const COLORS = Object.freeze({ blue: '#5035ff', pink: '#ff75ae', yellow: '#fff04d', mint: '#75e3c4', orange: '#ff783f', cream: PAPER });

function label(ctx, text, x, y, size = 26, color = INK, align = 'left', weight = '400') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color; ctx.textAlign = align;
  ctx.fillText(text, x, y);
}
function rule(ctx, x1, y1, x2, y2, color = INK, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function fit(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `700 ${size}px ${FONT}`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) { size--; ctx.font = `700 ${size}px ${FONT}`; }
  return size;
}
function circle(ctx, x, y, radius, fill, stroke = null, lineWidth = 3) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}
function star(ctx, x, y, radius, fill, count = 12, angle = 0) {
  ctx.beginPath();
  for (let i = 0; i < count * 2; i++) {
    const a = angle + i * Math.PI / count;
    const r = i % 2 ? radius * .72 : radius;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
}
function dots(ctx, x, y, width, height, step = 23, color = INK) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  for (let row = 0; row < height / step + 1; row++) {
    for (let col = 0; col < width / step + 1; col++) circle(ctx, x + col * step + row % 2 * step / 2, y + row * step, 2.4, color);
  }
  ctx.restore();
}
export function drawImageCover(ctx, source, x, y, width, height) {
  const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
  const ratio = Math.max(width / sw, height / sh), cw = width / ratio, ch = height / ratio;
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, width, height);
}
function artRole(ctx, text) {
  const chars = Array.from(text), gap = 9;
  let size = Math.min(282, Math.floor(1000 / chars.length));
  ctx.font = `900 ${size}px ${FONT}`;
  while (size > 20 && ctx.measureText(text).width + gap * (chars.length - 1) > 1000) {
    size--; ctx.font = `900 ${size}px ${FONT}`;
  }
  const widths = chars.map(c => ctx.measureText(c).width);
  let left = (1200 - widths.reduce((a, b) => a + b, 0) - gap * (chars.length - 1)) / 2;
  const fills = [COLORS.blue, '#ed3f89', '#fb7133', COLORS.blue];
  const angles = [-.055, .035, -.045, .04];
  chars.forEach((character, index) => {
    ctx.save(); ctx.translate(left + widths[index] / 2, 1053); ctx.rotate(angles[index % angles.length]);
    ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 16;
    ctx.strokeStyle = INK; ctx.fillStyle = INK;
    ctx.strokeText(character, 11, 15); ctx.fillText(character, 11, 15);
    ctx.strokeStyle = PAPER; ctx.strokeText(character, 0, 0);
    ctx.fillStyle = fills[index % fills.length]; ctx.fillText(character, 0, 0);
    ctx.restore(); left += widths[index] + gap;
  });
}
export function drawCertificate(canvas, record = null, photo = null) {
  canvas.width = 1200; canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器无法绘制证书，请更换浏览器。');
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1200, 1600);

  // An original exhibition poster: color fields, halftone, collage, and type.
  ctx.fillStyle = COLORS.blue; ctx.fillRect(0, 0, 1200, 330);
  ctx.fillStyle = COLORS.yellow; ctx.fillRect(1060, 0, 140, 330);
  dots(ctx, 1060, 0, 140, 330, 22, '#4031bd');
  circle(ctx, -25, 850, 244, COLORS.mint);
  ctx.fillStyle = COLORS.pink; ctx.fillRect(1078, 800, 122, 342);
  dots(ctx, 1078, 800, 122, 342, 23);
  rule(ctx, 0, 329, 1200, 329, INK, 3);
  label(ctx, 'THE BUREAU / CHARACTER EXHIBITION', 70, 76, 21, PAPER);
  label(ctx, 'VOL. 01', 1030, 76, 20, PAPER, 'right');
  ctx.save(); ctx.font = `900 118px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = INK; ctx.fillText('国籍鉴定', 568, 219);
  ctx.fillStyle = COLORS.yellow; ctx.fillText('国籍鉴定', 561, 211); ctx.restore();

  // Photo collage. Pixels remain decorative and never enter the role selection.
  ctx.save(); ctx.translate(240, 551); ctx.rotate(-.055);
  ctx.fillStyle = COLORS.mint; ctx.fillRect(-176, -191, 352, 401);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-176, -191, 352, 401); ctx.restore();
  ctx.fillStyle = INK; ctx.fillRect(85, 367, 330, 390);
  ctx.fillStyle = '#fffdf7'; ctx.fillRect(76, 356, 330, 390);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(76, 356, 330, 390);
  const px = 99, py = 380, pw = 284, ph = 312;
  ctx.fillStyle = '#d1d8d0'; ctx.fillRect(px, py, pw, ph);
  if (photo) {
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    drawImageCover(ctx, photo, px, py, pw, ph); ctx.restore();
  } else {
    circle(ctx, 241, 477, 48, '#a7b4a6'); ctx.fillStyle = '#5a67a9';
    ctx.beginPath(); ctx.ellipse(241, 650, 95, 109, 0, 0, Math.PI * 2); ctx.fill();
  }
  label(ctx, 'EXHIBIT 01 / YOUR PORTRAIT', 241, 723, 15, INK, 'center');
  label(ctx, '记 录 对 象', 466, 418, 23, COLORS.blue);
  const name = record?.name || '照片持有人';
  label(ctx, name, 466, 486, fit(ctx, name, 626, 49), INK, 'left', '700');
  rule(ctx, 466, 518, 1090, 518, INK, 2);
  label(ctx, '生 成 日 期', 466, 566, 23, COLORS.blue);
  label(ctx, record?.date || '等待生成', 466, 619, 34, INK);

  star(ctx, 1015, 669, 92, COLORS.pink, 12, -.07);
  label(ctx, '本官', 1015, 662, 28, INK, 'center', '700');
  label(ctx, '已阅', 1015, 701, 28, INK, 'center', '700');
  ctx.save(); ctx.translate(643, 727); ctx.rotate(-.035);
  ctx.fillStyle = INK; ctx.fillRect(-216, -38, 432, 70);
  ctx.fillStyle = COLORS.yellow; ctx.fillRect(-223, -45, 432, 70);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(-223, -45, 432, 70);
  label(ctx, '本 官 今 日 钦 定', -7, 3, 31, INK, 'center', '700'); ctx.restore();

  // Individual colors and slight rotations create a large sticker-like title.
  artRole(ctx, record ? record.country.name + '人' : '待生成');
  const en = record?.country.en || 'YOUR CHARACTER';
  const englishSize = fit(ctx, en, 900, 49);
  label(ctx, en, 600, 1159, englishSize, COLORS.blue, 'center', '700');
  rule(ctx, 86, 1152, 238, 1152, INK, 3);
  rule(ctx, 962, 1152, 1114, 1152, INK, 3);
  label(ctx, record?.verdict?.title || '本官判词即将揭晓', 600, 1203, 27, INK, 'center');

  ctx.save(); ctx.translate(600, 1271); ctx.rotate(-.022);
  ctx.fillStyle = INK; ctx.fillRect(-518, -36, 1056, 92);
  ctx.fillStyle = COLORS.yellow; ctx.fillRect(-528, -47, 1056, 92);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-528, -47, 1056, 92);
  const verdictLine = record?.verdict?.line || '本官已阅，暂不接受狡辩。';
  label(ctx, verdictLine, 0, 12, fit(ctx, verdictLine, 1000, 38), INK, 'center', '700'); ctx.restore();

  ctx.fillStyle = COLORS.blue; ctx.fillRect(0, 1375, 1200, 225);
  rule(ctx, 0, 1375, 1200, 1375, INK, 3);
  label(ctx, '纪 念 编 号', 76, 1437, 21, '#d8ceff');
  label(ctx, record?.serial || 'FUN-PREVIEW-0000', 76, 1487, 27, PAPER);
  label(ctx, '国籍鉴定', 1124, 1441, 39, COLORS.yellow, 'right', '700');
  label(ctx, 'THE BUREAU HAS SPOKEN', 1124, 1487, 18, PAPER, 'right');
  rule(ctx, 76, 1532, 1124, 1532, '#ad9cff', 1);
  label(ctx, '01 / CHARACTER EXHIBITION', 1124, 1573, 17, PAPER, 'right');
  ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 1194, 1594);
  return canvas;
}
