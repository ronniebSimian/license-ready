// Progress lives only in this browser (localStorage). No accounts, nothing sent anywhere.

const KEY = s => `license-ready:${s}`;

export function load(stateId) {
  try {
    const p = JSON.parse(localStorage.getItem(KEY(stateId)));
    if (p && p.facts) return Object.assign(blank(), p);
  } catch { /* corrupted or missing: start fresh */ }
  return blank();
}

export function save(stateId, p) {
  localStorage.setItem(KEY(stateId), JSON.stringify(p));
}

export function reset(stateId) {
  localStorage.removeItem(KEY(stateId));
}

function blank() {
  return { facts: {}, xp: 0, days: [], best: { sprint: 0 }, exams: [], badges: [], today: { date: '', cards: 0 } };
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Count a studied card toward today's goal and the daily streak.
export function tick(p, xp) {
  const t = today();
  if (p.today.date !== t) p.today = { date: t, cards: 0 };
  p.today.cards++;
  p.xp += xp;
  if (p.days[p.days.length - 1] !== t) p.days.push(t);
  if (p.days.length > 400) p.days = p.days.slice(-400);
}

export function streak(p) {
  const set = new Set(p.days);
  const d = new Date();
  // A streak survives until the end of today even if you haven't studied yet.
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fmt(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function level(xp) {
  return Math.floor(Math.sqrt(xp / 40)) + 1;
}
export function levelProgress(xp) {
  const l = level(xp);
  const lo = 40 * (l - 1) ** 2, hi = 40 * l ** 2;
  return (xp - lo) / (hi - lo);
}

export function getPref(k, dflt) { return localStorage.getItem(`license-ready:pref:${k}`) ?? dflt; }
export function setPref(k, v) { localStorage.setItem(`license-ready:pref:${k}`, v); }
