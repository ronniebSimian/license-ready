// Validates content and refreshes the service worker's precache list + version.
// Run after any content change:  node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
let errors = 0;
const err = m => { errors++; console.error('✘', m); };

// ---- validate every state ----
const en = json('i18n/en.json');
for (const f of readdirSync(join(root, 'i18n'))) {
  const ui = json(`i18n/${f}`);
  for (const k of Object.keys(en)) if (!(k in ui)) err(`i18n/${f}: missing key ${k}`);
}
for (const st of readdirSync(join(root, 'states'))) {
  const dir = `states/${st}`;
  if (!existsSync(join(root, dir, 'state.json'))) continue;
  const state = json(`${dir}/state.json`);
  const base = json(`${dir}/facts.en.json`);
  const ids = new Set();
  for (const f of base) {
    if (ids.has(f.id)) err(`${st}: duplicate id ${f.id}`);
    ids.add(f.id);
    if (!state.topics.includes(f.topic)) err(`${st}/${f.id}: unknown topic ${f.topic}`);
    if (![1, 2, 3].includes(f.weight)) err(`${st}/${f.id}: bad weight`);
    if (f.sign && !existsSync(join(root, dir, 'signs', `${f.sign}.svg`))) err(`${st}/${f.id}: missing sign image ${f.sign}.svg`);
    if (!f.items?.length) err(`${st}/${f.id}: no items`);
    for (const it of f.items || []) {
      if (['mc', 'scenario', 'sign'].includes(it.type) && (it.choices?.length !== 4 || !(it.answer >= 0 && it.answer < 4))) err(`${st}/${f.id}: bad choices`);
      if (it.type === 'sign' && !f.sign) err(`${st}/${f.id}: sign item without sign`);
      if (it.type === 'tf' && typeof it.answer !== 'boolean') err(`${st}/${f.id}: tf answer not boolean`);
      if (it.type === 'num' && typeof it.answer !== 'number') err(`${st}/${f.id}: num answer not number`);
    }
  }
  // Translations must line up item-for-item with English so answers stay correct.
  for (const lang of state.languages.filter(l => l.code !== 'en')) {
    const p = `${dir}/facts.${lang.code}.json`;
    if (!existsSync(join(root, p))) { console.warn(`! ${p} missing (app falls back to English)`); continue; }
    const tr = new Map(json(p).map(f => [f.id, f]));
    for (const f of base) {
      const g = tr.get(f.id);
      if (!g) { err(`${p}: missing ${f.id}`); continue; }
      if (g.items.length !== f.items.length) { err(`${p}/${f.id}: item count differs`); continue; }
      f.items.forEach((it, i) => {
        const gi = g.items[i];
        if (gi.type !== it.type || JSON.stringify(gi.answer) !== JSON.stringify(it.answer) || (it.choices && gi.choices?.length !== it.choices.length))
          err(`${p}/${f.id}: item ${i} doesn't match English`);
      });
      for (const k of ['topic', 'page', 'weight', 'sign']) if (g[k] !== f[k]) err(`${p}/${f.id}: ${k} differs`);
    }
    if (tr.size !== base.length) err(`${p}: ${tr.size} facts vs ${base.length} in English`);
  }
  console.log(`✔ ${st}: ${base.length} facts`);
}

// ---- service worker precache ----
// Only files that are published: keep in step with .gitignore.
const skip = /^(\.git|tools|pipeline|notes|work|node_modules|README|LICENSE|CONTENT|CNAME|\.)/;
const assets = [];
(function walk(d) {
  for (const n of readdirSync(join(root, d))) {
    const rel = d ? `${d}/${n}` : n;
    if (!d && skip.test(n)) continue;
    if (rel === 'sw.js') continue;
    statSync(join(root, rel)).isDirectory() ? walk(rel) : assets.push(rel);
  }
})('');
assets.sort();
const hash = createHash('sha256');
for (const a of assets) hash.update(a).update(readFileSync(join(root, a)));
const version = hash.digest('hex').slice(0, 10);
let sw = read('sw.js')
  .replace(/const VERSION = '.*?';/, `const VERSION = '${version}';`)
  .replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = ${JSON.stringify(['./', ...assets], null, 0).replaceAll('","', '",\n  "')};`);
writeFileSync(join(root, 'sw.js'), sw);
console.log(`✔ sw.js: ${assets.length} assets, version ${version}`);
if (errors) { console.error(`${errors} error(s)`); process.exit(1); }
