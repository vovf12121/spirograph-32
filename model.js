// Тут тільки формули та перетворення координат.
function gcd(a, b) {
  while (b !== 0) {
    const r = a % b;
    a = b;
    b = r;
  }
  return a;
}

function checkParams(p) {
  if (![p.A, p.B, p.D].every(Number.isFinite)) return 'Заповни всі три числа.';
  if (!Number.isInteger(p.A) || !Number.isInteger(p.B)) return 'A та B мають бути цілими.';
  if (p.A < 2 || p.A > 240) return 'A має бути від 2 до 240.';
  if (p.B <= 0 || p.B >= p.A) return 'Потрібно: 0 < B < A.';
  if (p.D <= 0 || p.D >= p.B) return 'Потрібно: 0 < D < B.';
  return '';
}

// Формула з доданого файла, варіант 32: phi = (A / B) * t.
function getPoint(p, t) {
  const r = p.A - p.B;
  const phi = p.A / p.B * t;
  const cx = r * Math.cos(t);
  const cy = r * Math.sin(t);
  return {
    x: cx + p.D * Math.cos(phi),
    y: cy - p.D * Math.sin(phi),
    cx: cx, cy: cy
  };
}

function makeCurve(p) {
  const g = gcd(p.A, p.B);
  const n = p.B / g;
  const end = 2 * Math.PI * n;
  const count = Math.max(2000, 160 * p.A / g);
  const points = [];
  for (let i = 0; i <= count; i++) {
    const point = getPoint(p, end * i / count);
    points.push({ x: point.x, y: point.y });
  }
  return { n: n, end: end, points: points };
}

function toScreen(x, y, view, width, height) {
  return {
    x: width / 2 + (x - view.x) * view.scale,
    y: height / 2 - (y - view.y) * view.scale
  };
}

function toWorld(x, y, view, width, height) {
  return {
    x: view.x + (x - width / 2) / view.scale,
    y: view.y - (y - height / 2) / view.scale
  };
}

function fitModel(radius, width, height) {
  return { x: 0, y: 0, scale: Math.min(width, height) / (2.4 * radius) };
}
