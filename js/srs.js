// Spaced-repetition engine. Pure functions over a progress object; no DOM.
//
// Each fact moves through boxes 0..6. A box is "how well you know it":
// the higher the box, the longer until we ask again. Lucky guesses don't
// promote a fact, and confident mistakes demote it hardest and come back soonest.

const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;

// Wait time before a fact in box N is due again.
export const INTERVALS = [0, 10 * MIN, 8 * HOUR, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY];
// Estimated chance of answering correctly on the test, by box (unseen = random guess).
const RECALL = [0.35, 0.55, 0.7, 0.8, 0.88, 0.93, 0.96];
const UNSEEN = 0.25;
export const MASTERED_BOX = 4;

export function factState(progress, id) {
  return progress.facts[id] || null;
}

// outcome: 'sure-right' | 'guess-right' | 'guess-wrong' | 'sure-wrong'
export function grade(progress, fact, outcome, now = Date.now()) {
  const s = progress.facts[fact.id] || { b: 0, n: 0, ok: 0, miss: 0, last: 0, due: 0 };
  s.n++;
  s.last = now;
  if (outcome === 'sure-right') { s.b = Math.min(6, s.b + 1); s.ok++; }
  else if (outcome === 'guess-right') { s.b = Math.max(s.b, 1); s.ok++; }
  else if (outcome === 'guess-wrong') { s.b = 0; s.miss++; }
  else { s.b = 0; s.miss++; s.surprise = (s.surprise || 0) + 1; }
  s.due = now + INTERVALS[s.b];
  progress.facts[fact.id] = s;
  return s;
}

export function recallChance(progress, fact, now = Date.now()) {
  const s = progress.facts[fact.id];
  if (!s) return UNSEEN;
  let p = RECALL[s.b];
  // Overdue facts fade: lose up to half their edge over guessing once badly overdue.
  const overdue = now - s.due;
  if (overdue > 0 && s.b > 0) {
    const fade = Math.min(1, overdue / (INTERVALS[s.b] * 3 + DAY));
    p = p - (p - UNSEEN) * 0.5 * fade;
  }
  return p;
}

// Expected test accuracy, weighting facts by how likely they are to be asked.
export function readiness(progress, facts, exam, now = Date.now()) {
  let w = 0, sum = 0;
  for (const f of facts) { w += f.weight; sum += f.weight * recallChance(progress, f, now); }
  const acc = w ? sum / w : 0;
  const pass = passChance(acc, exam.questions, exam.maxMisses);
  return { acc, pass };
}

// P(misses <= maxMisses) when each of n questions is right with probability p.
export function passChance(p, n, maxMisses) {
  let total = 0;
  for (let k = 0; k <= maxMisses; k++) total += binom(n, k) * Math.pow(1 - p, k) * Math.pow(p, n - k);
  return Math.min(1, total);
}
function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }

export function mastery(progress, facts) {
  if (!facts.length) return 0;
  return facts.filter(f => (progress.facts[f.id]?.b || 0) >= MASTERED_BOX).length / facts.length;
}

// Build a study session: due reviews first (most overdue first), then new facts
// by importance. Topics are interleaved so the same chapter never runs back to back.
export function buildSession(progress, facts, size = 15, now = Date.now()) {
  const due = facts.filter(f => progress.facts[f.id] && progress.facts[f.id].due <= now)
    .sort((a, b) => progress.facts[a.id].due - progress.facts[b.id].due);
  const fresh = facts.filter(f => !progress.facts[f.id])
    .sort((a, b) => b.weight - a.weight || Math.random() - 0.5);
  // Keep new material to a third of the session when there's a review backlog.
  const newCap = due.length >= size ? Math.ceil(size / 3) : size - due.length;
  let pick = [...fresh.slice(0, newCap), ...due].slice(0, size);
  if (pick.length < size) {
    // Everything known and nothing due: practise the weakest facts early.
    const rest = facts.filter(f => !pick.includes(f))
      .sort((a, b) => (progress.facts[a.id]?.b ?? 0) - (progress.facts[b.id]?.b ?? 0) || Math.random() - 0.5);
    pick = pick.concat(rest.slice(0, size - pick.length));
  }
  return interleave(shuffle(pick));
}

export function interleave(list) {
  const out = [], pool = [...list];
  while (pool.length) {
    const prev = out[out.length - 1];
    let i = pool.findIndex(f => !prev || f.topic !== prev.topic);
    if (i < 0) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

// Pick which question form to ask. Easier recognition while a fact is new,
// harder recall (typed numbers, scenarios) once it's settling in.
export function pickItem(fact, progress, lastType) {
  const b = progress.facts[fact.id]?.b ?? 0;
  const items = fact.items;
  const easy = ['tf', 'mc', 'sign'], hard = ['num', 'scenario', 'sign', 'mc'];
  const pref = b < 2 ? easy : hard;
  let cands = items.filter(it => pref.includes(it.type) && it.type !== lastType);
  if (!cands.length) cands = items.filter(it => pref.includes(it.type));
  if (!cands.length) cands = items;
  if (b >= 2) {
    const tough = cands.filter(it => it.type === 'num' || it.type === 'scenario');
    if (tough.length && Math.random() < 0.7) cands = tough;
  }
  return cands[Math.floor(Math.random() * cands.length)];
}

// Mock exam: n questions in multiple-choice form, spread across topics by weight.
export function buildExam(facts, n) {
  const usable = facts.filter(f => f.items.some(examable));
  const bag = [];
  for (const f of usable) for (let i = 0; i < f.weight * f.weight; i++) bag.push(f);
  const chosen = new Set();
  while (chosen.size < Math.min(n, usable.length)) chosen.add(bag[Math.floor(Math.random() * bag.length)]);
  return shuffle([...chosen]).map(f => {
    const opts = f.items.filter(examable);
    return { fact: f, item: opts[Math.floor(Math.random() * opts.length)] };
  });
}
const examable = it => it.type === 'mc' || it.type === 'scenario' || it.type === 'sign' || it.type === 'tf';

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
