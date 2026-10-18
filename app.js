const board = document.getElementById('board');
const ctx = board.getContext('2d');
const currentColor = '#ac462d';
const savedColor = '#32627e';
let params = { A: 96, B: 36, D: 28 };
let curve = makeCurve(params);
let saved = null;
let view = { x: 0, y: 0, scale: 1 };
let width = 800, height = 510;
let progress = 1;
let playing = false;
let lastTime = 0;
let frame = 0;
let valid = true;

function el(id) { return document.getElementById(id); }
function message(text) { el('status').textContent = text; }

function updateBounds() {
  el('x1').value = (view.x - width / (2 * view.scale)).toFixed(2);
  el('x2').value = (view.x + width / (2 * view.scale)).toFixed(2);
  el('y1').value = (view.y - height / (2 * view.scale)).toFixed(2);
  el('y2').value = (view.y + height / (2 * view.scale)).toFixed(2);
}

function showAll() {
  let radius = params.A;
  if (saved) radius = Math.max(radius, saved.params.A);
  view = fitModel(radius, width, height);
  updateBounds();
  draw();
}

function resize() {
  const rect = board.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  board.width = Math.round(width * ratio);
  board.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  showAll();
}

function line(c, x1, y1, x2, y2) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}

function drawAxes(c, w, h, v) {
  const x1 = v.x - w / (2 * v.scale), x2 = v.x + w / (2 * v.scale);
  const y1 = v.y - h / (2 * v.scale), y2 = v.y + h / (2 * v.scale);
  let step = 1;
  while (step * v.scale < 45) step *= 2;
  const o = toScreen(0, 0, v, w, h);
  c.lineWidth = 0.7; c.strokeStyle = '#e0e3da';
  c.fillStyle = '#879080'; c.font = '10px Arial';
  c.textAlign = 'center';
  for (let x = Math.ceil(x1 / step) * step; x <= x2; x += step) {
    const q = toScreen(x, 0, v, w, h);
    line(c, q.x, 0, q.x, h);
    if (x !== 0) c.fillText(String(x), q.x, Math.max(14, Math.min(h - 8, o.y + 15)));
  }
  c.textAlign = 'right';
  for (let y = Math.ceil(y1 / step) * step; y <= y2; y += step) {
    const q = toScreen(0, y, v, w, h);
    line(c, 0, q.y, w, q.y);
    if (y !== 0) c.fillText(String(y), Math.max(25, Math.min(w - 8, o.x - 6)), q.y + 3);
  }
  c.strokeStyle = '#97a18d'; c.lineWidth = 1;
  line(c, 0, o.y, w, o.y); line(c, o.x, 0, o.x, h);
  // На осях позначаємо одиниці; при сильному віддаленні укрупнюємо штрихи.
  const tick = v.scale >= 2 ? 1 : step;
  if (o.y >= 0 && o.y <= h) {
    for (let x = Math.ceil(x1 / tick) * tick; x <= x2; x += tick) {
      const q = toScreen(x, 0, v, w, h); line(c, q.x, o.y - 2, q.x, o.y + 2);
    }
  }
  if (o.x >= 0 && o.x <= w) {
    for (let y = Math.ceil(y1 / tick) * tick; y <= y2; y += tick) {
      const q = toScreen(0, y, v, w, h); line(c, o.x - 2, q.y, o.x + 2, q.y);
    }
  }
  c.textAlign = 'left';
  if (o.x >= 0 && o.x < w - 20 && o.y >= 0 && o.y < h - 20) c.fillText('0', o.x + 5, o.y + 14);
  if (o.y >= 18 && o.y < h) c.fillText('x →', w - 28, o.y - 6);
  if (o.x >= 0 && o.x < w - 20) c.fillText('y ↑', o.x + 6, 15);
}

function drawCurve(c, data, color, part, w, h, v) {
  c.strokeStyle = color; c.lineWidth = 1.6;
  c.beginPath();
  const end = Math.floor((data.points.length - 1) * part);
  for (let i = 0; i <= end; i++) {
    const p = data.points[i];
    const q = toScreen(p.x, p.y, v, w, h);
    if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
  }
  c.stroke();
}

function drawMechanism(c, part, w, h, v) {
  const p = getPoint(params, curve.end * part);
  const o = toScreen(0, 0, v, w, h);
  const center = toScreen(p.cx, p.cy, v, w, h);
  const pen = toScreen(p.x, p.y, v, w, h);
  c.strokeStyle = '#a3aa9a'; c.lineWidth = 1;
  c.beginPath(); c.arc(o.x, o.y, params.A * v.scale, 0, 2 * Math.PI); c.stroke();
  c.beginPath(); c.arc(center.x, center.y, params.B * v.scale, 0, 2 * Math.PI); c.stroke();
  line(c, center.x, center.y, pen.x, pen.y);
  c.fillStyle = currentColor;
  c.beginPath(); c.arc(pen.x, pen.y, 3.5, 0, 2 * Math.PI); c.fill();
}

function drawPlot(c, w, h, v, part) {
  c.clearRect(0, 0, w, h); c.fillStyle = '#faf9f5'; c.fillRect(0, 0, w, h);
  drawAxes(c, w, h, v);
  if (saved) drawCurve(c, saved.curve, savedColor, 1, w, h, v);
  drawCurve(c, curve, currentColor, part, w, h, v);
  drawMechanism(c, part, w, h, v);
}

function draw() { drawPlot(ctx, width, height, view, progress); }

function stop() {
  playing = false;
  cancelAnimationFrame(frame);
  el('play').textContent = 'Побудувати';
}

function tick(time) {
  if (!playing) return;
  if (lastTime) progress += Math.min((time - lastTime) / 1000, 0.1) / 8;
  lastTime = time;
  if (progress >= 1) {
    progress = 1; stop(); message('Побудову завершено. Олівець повернувся на початок.');
  }
  draw();
  if (playing) frame = requestAnimationFrame(tick);
}

function updateTable() {
  for (const key of ['A', 'B', 'D']) el('current' + key).textContent = params[key];
  el('currentN').textContent = curve.n;
  el('savedRow').hidden = saved === null;
  if (saved) {
    for (const key of ['A', 'B', 'D']) el('saved' + key).textContent = saved.params[key];
    el('savedN').textContent = saved.curve.n;
    el('compareHint').textContent = 'Червоний — поточний результат, синій — збережений. Масштаб у них спільний.';
  } else {
    el('compareHint').textContent = 'Збережи результат, потім зміни один параметр. Обидва візерунки буде видно на спільному полі.';
  }
  el('turns').textContent = `Обертів до замикання: ${curve.n}. n = ${params.B} / НСД(${params.A}, ${params.B}).`;
}

function readParams() {
  const p = { A: parseFloat(el('numA').value), B: parseFloat(el('numB').value), D: parseFloat(el('numD').value) };
  const error = checkParams(p);
  stop(); valid = error === '';
  el('error').textContent = error; el('error').hidden = valid;
  el('play').disabled = el('save').disabled = el('export').disabled = !valid;
  if (!valid) { message('Виправ числа. На полі залишився останній правильний результат.'); return; }
  params = p; curve = makeCurve(params); progress = 1;
  updateTable(); showAll();
  message('Візерунок перебудовано. Натисни «Побудувати», щоб побачити рух олівця.');
}

function pan(direction) {
  const step = 50 / view.scale;
  if (direction === 'left') view.x -= step;
  if (direction === 'right') view.x += step;
  if (direction === 'up') view.y += step;
  if (direction === 'down') view.y -= step;
  updateBounds(); draw();
}

function zoom(factor) {
  view.scale = Math.max(0.0001, Math.min(5000, view.scale * factor));
  updateBounds(); draw();
}

function exportPng() {
  if (!valid) return;
  const image = document.createElement('canvas'); image.width = 1400; image.height = 1180;
  const c = image.getContext('2d');
  c.fillStyle = '#faf9f5'; c.fillRect(0, 0, 1400, 1180);
  c.fillStyle = '#303b42'; c.font = '30px Arial'; c.fillText('Спірограф — варіант 32', 40, 55);
  let radius = params.A;
  if (saved) radius = Math.max(radius, saved.params.A);
  c.save(); c.translate(40, 85);
  c.beginPath(); c.rect(0, 0, 1320, 850); c.clip();
  drawPlot(c, 1320, 850, fitModel(radius, 1320, 850), 1); c.restore();
  c.strokeStyle = '#b8c2c9'; c.strokeRect(40, 85, 1320, 850);
  c.font = '20px Arial'; c.fillStyle = currentColor;
  c.fillText(`Поточний: A = ${params.A}; B = ${params.B}; D = ${params.D}; обертів = ${curve.n}`, 40, 990, 1320);
  if (saved) {
    c.fillStyle = savedColor;
    c.fillText(`Збережений: A = ${saved.params.A}; B = ${saved.params.B}; D = ${saved.params.D}; обертів = ${saved.curve.n}`, 40, 1030, 1320);
  }
  c.fillStyle = '#75818a'; c.font = '17px Arial';
  c.fillText('Повні криві. Однаковий масштаб осей. Довжини — в умовних одиницях.', 40, 1110);
  image.toBlob(function (blob) {
    if (!blob) { message('Не вдалося створити PNG. Спробуй ще раз.'); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'spirograph.png';
    document.body.append(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    message('PNG підготовлено. Перевір завантаження браузера.');
  }, 'image/png');
}

for (const key of ['A', 'B', 'D']) el('num' + key).addEventListener('input', readParams);
el('play').addEventListener('click', function () {
  if (!valid) return;
  if (playing) { stop(); message('Побудову призупинено.'); return; }
  if (progress >= 1) progress = 0;
  playing = true; lastTime = 0; el('play').textContent = 'Пауза';
  message('Побудова триває. Червона точка показує положення олівця.');
  frame = requestAnimationFrame(tick);
});
el('save').addEventListener('click', function () {
  if (!valid) return;
  saved = { params: { A: params.A, B: params.B, D: params.D }, curve: curve };
  updateTable(); showAll();
  message('Синій результат збережено. Тепер зміни A, B або D для порівняння.');
});
el('reset').addEventListener('click', function () {
  saved = null; el('numA').value = 96; el('numB').value = 36; el('numD').value = 28;
  readParams(); message('Почато новий дослід. Порівняння очищено.');
});
el('zoomIn').addEventListener('click', function () { zoom(1.25); });
el('zoomOut').addEventListener('click', function () { zoom(0.8); });
el('fit').addEventListener('click', showAll);
document.querySelectorAll('[data-pan]').forEach(function (button) {
  button.addEventListener('click', function () { pan(button.dataset.pan); });
});
el('applyBounds').addEventListener('click', function () {
  const x1 = parseFloat(el('x1').value), x2 = parseFloat(el('x2').value);
  const y1 = parseFloat(el('y1').value), y2 = parseFloat(el('y2').value);
  if (![x1, x2, y1, y2].every(Number.isFinite) || x2 - x1 < 0.1 || y2 - y1 < 0.1 || Math.max(Math.abs(x1), Math.abs(x2), Math.abs(y1), Math.abs(y2)) > 1000000) {
    message('Потрібно: x₁ < x₂, y₁ < y₂; інтервали від 0,1; координати до ±1 000 000.'); return;
  }
  view = { x: (x1 + x2) / 2, y: (y1 + y2) / 2, scale: Math.min(width / (x2 - x1), height / (y2 - y1)) };
  updateBounds(); draw(); message('Межі застосовано. Область розширено за потреби, щоб кола не спотворювалися.');
});
board.addEventListener('pointermove', function (event) {
  const r = board.getBoundingClientRect();
  const p = toWorld(event.clientX - r.left, event.clientY - r.top, view, width, height);
  el('coordinates').textContent = `x: ${p.x.toFixed(2)}; y: ${p.y.toFixed(2)}`;
});
el('export').addEventListener('click', exportPng);
el('helpOpen').addEventListener('click', function () {
  if (playing) { stop(); message('Побудову призупинено на час пояснення.'); }
  el('help').showModal();
});
el('helpClose').addEventListener('click', function () { el('help').close(); });
document.addEventListener('visibilitychange', function () { if (document.hidden && playing) { stop(); message('Побудову призупинено, бо вкладка неактивна.'); } });
updateTable(); resize();
new ResizeObserver(resize).observe(el('paper'));
