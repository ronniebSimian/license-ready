import * as srs from './srs.js';
import * as store from './store.js';

const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
const topstats = document.getElementById('topstats');

const S = {
  stateId: store.getPref('state', 'idaho'),
  lang: store.getPref('lang', ''),
  state: null,        // states/<id>/state.json
  facts: [],          // facts in current language
  byId: new Map(),
  ui: {}, uiEn: {},
  progress: null,
  installEvt: null,
};

// ---------- helpers ----------

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function t(key, vars = {}) {
  let s = S.ui[key] ?? S.uiEn[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
const pct = x => `${Math.round(x * 100)}%`;
const topicName = id => t(`topic.${id}`);
const save = () => store.save(S.stateId, S.progress);
const handbookLink = page => `${S.state.handbook.url}#page=${page + (S.state.handbook.pageOffset || 0)}`;
const signSrc = code => `states/${S.stateId}/signs/${code}.svg`;
const $ = sel => app.querySelector(sel);
// Running screens remember fact ids and item positions rather than text, so a language
// switch can look the same question up again (translations line up item-for-item).
const factOf = id => S.byId.get(id);
const choiceOrder = item => item.choices ? srs.shuffle(item.choices.map((c, i) => i)) : null;
// The answer picked but not yet committed, so a redraw can keep it.
function pendingAnswer() {
  const b = app.querySelector('.choice.picked');
  if (b) return b.dataset.v;
  return $('.numin')?.value.trim() || null;
}
// Redraw a question that was already answered: inputs locked, right/wrong marked.
function lockAnswered(item, given) {
  app.querySelectorAll('.choice, .numin').forEach(b => b.disabled = true);
  const inp = $('.numin'); if (inp && given != null) inp.value = given;
  markChoices(item, given);
}

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

function render(html, focus = true) {
  app.innerHTML = html;
  if (focus) app.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  updateChrome();
}

function updateChrome() {
  const p = S.progress;
  const st = store.streak(p);
  topstats.innerHTML = `
    <button class="pill langbtn" data-lang-open aria-label="${esc(LANG_LABEL)}" title="${esc(LANG_LABEL)}">🌐 ${esc(S.lang.toUpperCase())}</button>
    <span class="pill" title="${esc(t('stat.streak'))}">🔥 ${st}</span>
    <span class="pill" title="${esc(t('stat.level'))}">⭐ ${esc(t('stat.lv'))} ${store.level(p.xp)}</span>`;
  const route = location.hash.split('/')[1] || '';
  const tabs = [['', '🏠', 'tab.home'], ['study', '🧠', 'tab.study'], ['sprint', '🛑', 'tab.signs'], ['exam', '📝', 'tab.exam'], ['topics', '🗺️', 'tab.topics'], ['more', '⚙️', 'tab.more']];
  tabbar.innerHTML = tabs.map(([r, icon, k]) =>
    `<a href="#/${r}" class="${route === r ? 'on' : ''}"><span aria-hidden="true">${icon}</span><small>${esc(t(k))}</small></a>`).join('');
}

// ---------- language picker ----------

// Shown in every language at once, so anyone can recognise it whatever the app is set to.
const LANG_LABEL = 'Language · Idioma · اللغة · 语言 · Язык · Lugha';

function langButtons() {
  return S.state.languages.map(l =>
    `<button class="langopt ${l.code === S.lang ? 'on' : ''}" data-lang="${l.code}" lang="${l.code}" dir="${l.rtl ? 'rtl' : 'ltr'}">${esc(l.name)}</button>`).join('');
}

function openLangPicker() {
  const dlg = document.createElement('dialog');
  dlg.className = 'langdlg';
  dlg.innerHTML = `<h2>🌐 ${esc(LANG_LABEL)}</h2><div class="langlist">${langButtons()}</div>
    <button class="btn" data-close>✕</button>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  dlg.showModal();
}

async function setLanguage(code) {
  store.setPref('lang', code);
  await loadLanguage(code);
  document.querySelector('dialog.langdlg')?.close();
  // A running study round, sprint or exam redraws the same question in the new language;
  // every other screen just re-renders. Either way the reader keeps their place on the page.
  const y = window.scrollY;
  if (S.relang) { if (S.cleanup) { S.cleanup(); S.cleanup = null; } S.relang(); }
  else route();
  window.scrollTo(0, y);
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-lang-open]')) return openLangPicker();
  const opt = e.target.closest('[data-lang]');
  if (opt) setLanguage(opt.dataset.lang);
});

// ---------- boot ----------

async function boot() {
  S.uiEn = await getJSON('i18n/en.json');
  S.state = await getJSON(`states/${S.stateId}/state.json`);
  if (!S.lang) {
    const nav = (navigator.language || 'en').slice(0, 2);
    S.lang = S.state.languages.some(l => l.code === nav) ? nav : 'en';
  }
  await loadLanguage(S.lang);
  S.progress = store.load(S.stateId);
  document.getElementById('brand-state').textContent = S.state.name;
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (!location.hash || location.hash === '#/') route(); });
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function loadLanguage(code) {
  const lang = S.state.languages.find(l => l.code === code) || S.state.languages[0];
  S.lang = lang.code;
  S.ui = lang.code === 'en' ? S.uiEn : await getJSON(`i18n/${lang.code}.json`).catch(() => S.uiEn);
  const facts = await getJSON(`states/${S.stateId}/facts.${lang.code}.json`).catch(() => getJSON(`states/${S.stateId}/facts.en.json`));
  S.facts = facts;
  S.byId = new Map(facts.map(f => [f.id, f]));
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? 'rtl' : 'ltr';
}

function route() {
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  S.relang = null;
  const [, r, arg] = location.hash.split('/');
  ({ study: viewStudy, sprint: viewSprint, exam: viewExam, topics: viewTopics, topic: viewTopic, more: viewMore }[r] || viewHome)(arg);
}

// ---------- home ----------

function viewHome() {
  const p = S.progress;
  const { acc, pass } = srs.readiness(p, S.facts, S.state.exam);
  const now = Date.now();
  const due = S.facts.filter(f => p.facts[f.id] && p.facts[f.id].due <= now).length;
  const seen = S.facts.filter(f => p.facts[f.id]).length;
  const mastered = srs.mastery(p, S.facts);
  const goal = S.state.dailyGoal || 30;
  const todayCards = p.today.date === store.today() ? p.today.cards : 0;
  const expect = Math.round(acc * S.state.exam.questions);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

  const chooseLang = !store.getPref('lang', '') && !Object.keys(p.facts).length;
  render(`
    ${chooseLang ? `<section class="card langstrip"><p>🌐 ${esc(LANG_LABEL)}</p><div class="langlist row4">${langButtons()}</div></section>` : ''}
    <section class="hero card">
      <div class="ring" style="--p:${pass}" role="img" aria-label="${esc(t('home.passChance'))} ${pct(pass)}">
        <div><b>${pct(pass)}</b><small>${esc(t('home.passChance'))}</small></div>
      </div>
      <div class="hero-text">
        <h1>${esc(seen ? t('home.titleBack') : t('home.titleNew'))}</h1>
        <p>${esc(seen ? t('home.expect', { n: expect, of: S.state.exam.questions, max: S.state.exam.maxMisses }) : t('home.intro', { n: S.facts.length }))}</p>
        <a class="btn primary big" href="#/study">${esc(seen ? t('home.continue') : t('home.start'))}${due ? ` <span class="badge">${due} ${esc(t('home.due'))}</span>` : ''}</a>
      </div>
    </section>

    <section class="card goal">
      <div class="row"><span>${esc(t('home.dailyGoal'))}</span><span>${Math.min(todayCards, goal)} / ${goal}</span></div>
      <div class="bar"><i style="width:${Math.min(100, todayCards / goal * 100)}%"></i></div>
      <div class="row small muted"><span>${esc(t('home.mastered'))}: ${pct(mastered)}</span><span>${esc(t('stat.lv'))} ${store.level(p.xp)} · ${p.xp} XP</span></div>
    </section>

    <section class="grid2">
      <a class="card tile" href="#/sprint"><span class="tile-icon">🛑</span><b>${esc(t('home.sprint'))}</b><small>${esc(t('home.sprintSub', { best: p.best.sprint || 0 }))}</small></a>
      <a class="card tile" href="#/exam"><span class="tile-icon">📝</span><b>${esc(t('home.exam'))}</b><small>${esc(t('home.examSub', { n: S.state.exam.questions }))}</small></a>
      <a class="card tile" href="#/topics"><span class="tile-icon">🗺️</span><b>${esc(t('home.map'))}</b><small>${esc(t('home.mapSub'))}</small></a>
      <a class="card tile" href="${esc(S.state.handbook.url)}" target="_blank" rel="noopener"><span class="tile-icon">📘</span><b>${esc(t('home.handbook'))}</b><small>${esc(S.state.handbook.edition)}</small></a>
    </section>

    ${S.installEvt ? `<button class="card install" id="install">📲 ${esc(t('home.install'))}</button>` : isIOS ? `<p class="card install muted small">📲 ${esc(t('home.installIOS'))}</p>` : ''}

    <section class="card how">
      <h2>${esc(t('how.title'))}</h2>
      <ul>
        <li>${esc(t('how.1'))}</li>
        <li>${esc(t('how.2'))}</li>
        <li>${esc(t('how.3'))}</li>
        <li>${esc(t('how.4'))}</li>
      </ul>
    </section>
    <p class="fineprint">${esc(t('disclaimer', { agency: S.state.agency }))}</p>
  `);
  $('#install')?.addEventListener('click', async () => { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; viewHome(); });
}

// ---------- question card (shared by study / exam / sprint) ----------

// Renders a question. onAnswer(correct:boolean, given) is called once the learner commits.
// opts.confidence: ask "sure / guessing" before committing (study mode).
function questionHTML(fact, item, opts = {}) {
  const img = item.type === 'sign' && fact.sign ? `<img class="sign" src="${signSrc(fact.sign)}" alt="${esc(t('q.signAlt'))}">` : '';
  let body = '';
  if (item.type === 'tf') {
    body = `<div class="choices tf">
      <button class="choice" data-v="true">${esc(t('q.true'))}</button>
      <button class="choice" data-v="false">${esc(t('q.false'))}</button></div>`;
  } else if (item.type === 'num') {
    body = `<form class="numform" autocomplete="off">
      <input class="numin" inputmode="decimal" enterkeyhint="done" aria-label="${esc(t('q.typeNumber'))}" placeholder="${esc(t('q.typeNumber'))}">
      <span class="unit">${esc(item.unit || '')}</span></form>`;
  } else {
    const order = opts.order || choiceOrder(item);
    body = `<div class="choices">${order.map((i, k) =>
      `<button class="choice" data-v="${i}"><span class="key">${'ABCD'[k]}</span><span>${esc(item.choices[i])}</span></button>`).join('')}</div>`;
  }
  const commit = opts.confidence
    ? `<div class="commit" hidden>
         <button class="btn sure" data-c="sure">✅ ${esc(t('q.sure'))}</button>
         <button class="btn guess" data-c="guess">🤔 ${esc(t('q.guess'))}</button>
       </div>`
    : `<div class="commit" hidden><button class="btn primary" data-c="go">${esc(opts.goLabel || t('q.next'))}</button></div>`;
  return `
    <article class="card qcard ${item.type === 'scenario' ? 'scenario' : ''}">
      <div class="qmeta"><span class="chip">${esc(topicName(fact.topic))}</span>${item.type === 'scenario' ? `<span class="chip alt">${esc(t('q.scenario'))}</span>` : ''}${item.type === 'num' ? `<span class="chip alt">${esc(t('q.recall'))}</span>` : ''}</div>
      ${img}
      <h2 class="qtext">${esc(item.q)}</h2>
      ${body}
      ${commit}
    </article>`;
}

function wireQuestion(item, onCommit, { confidence = false, instant = false, given: restore = null } = {}) {
  let given = null;
  const commitBox = $('.commit');
  const choose = v => {
    given = v;
    app.querySelectorAll('.choice').forEach(b => b.classList.toggle('picked', b.dataset.v === String(v)));
    if (instant) return finish('go');
    commitBox.hidden = false;
    commitBox.querySelector('button').focus({ preventScroll: true });
  };
  const finish = c => {
    if (given === null) return;
    let right;
    if (item.type === 'tf') right = String(item.answer) === String(given);
    else if (item.type === 'num') right = Math.abs(parseFloat(String(given).replace(',', '.')) - item.answer) < 1e-9;
    else right = Number(given) === item.answer;
    app.querySelectorAll('.choice, .numin').forEach(b => b.disabled = true);
    commitBox.hidden = true;
    onCommit(right, given, c === 'sure');
  };
  app.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => choose(b.dataset.v)));
  const form = $('.numform');
  if (form) {
    const inp = form.querySelector('input');
    inp.focus();
    inp.addEventListener('input', () => {
      given = inp.value.trim() === '' ? null : inp.value.trim();
      commitBox.hidden = given === null;
    });
    form.addEventListener('submit', e => { e.preventDefault(); if (given !== null) (confidence ? null : finish('go')); });
  }
  commitBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => finish(b.dataset.c)));
  if (restore !== null) {
    if (form) { form.querySelector('input').value = restore; given = restore; commitBox.hidden = false; }
    else choose(restore);
  }
  // Keyboard: 1-4 / A-D pick, T/F for true-false.
  const onKey = e => {
    if (e.target.tagName === 'INPUT') return;
    const btns = [...app.querySelectorAll('.choice:not(:disabled)')];
    const k = e.key.toLowerCase();
    const idx = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
    if (item.type === 'tf' && (k === 't' || k === 'f')) btns[k === 't' ? 0 : 1]?.click();
    else if (idx >= 0 && btns[idx]) btns[idx].click();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function answerText(item) {
  if (item.type === 'tf') return item.answer ? t('q.true') : t('q.false');
  if (item.type === 'num') return `${item.answer} ${item.unit || ''}`.trim();
  return item.choices[item.answer];
}

function explainHTML(fact) {
  return `
    <div class="explain">
      <p class="fact">${esc(fact.fact)}</p>
      ${fact.example ? `<p class="example"><b>${esc(t('fb.example'))}</b> ${esc(fact.example)}</p>` : ''}
      ${fact.why ? `<p class="why"><b>${esc(t('fb.why'))}</b> ${esc(fact.why)}</p>` : ''}
      ${fact.hook ? `<p class="hook">💡 ${esc(fact.hook)}</p>` : ''}
      <a class="src" href="${esc(handbookLink(fact.page))}" target="_blank" rel="noopener">📘 ${esc(t('fb.page', { p: fact.page }))}</a>
    </div>`;
}

// ---------- study session ----------

function viewStudy(topic) {
  const pool = topic ? S.facts.filter(f => f.topic === topic) : S.facts;
  const queue = srs.buildSession(S.progress, pool, S.state.sessionSize || 15);
  const before = srs.readiness(S.progress, S.facts, S.state.exam).pass;
  const masteredBefore = new Set(S.facts.filter(f => (S.progress.facts[f.id]?.b || 0) >= srs.MASTERED_BOX).map(f => f.id));
  const retries = new Map();
  const tally = { n: 0, right: 0, xp: 0, surprise: 0 };
  let lastType = null, total = queue.length;
  let cur = null;   // { id, ii, order, done, total, result? }

  const next = () => {
    if (!queue.length) return finish();
    const fact = factOf(queue.shift().id);
    const item = srs.pickItem(fact, S.progress, lastType);
    lastType = item.type;
    cur = { id: fact.id, ii: fact.items.indexOf(item), order: choiceOrder(item), done: total - queue.length - 1, total };
    showQuestion();
  };

  const page = (fact, item) => render(`
      <div class="progress"><i style="width:${cur.done / cur.total * 100}%"></i></div>
      ${topic ? `<p class="muted small center">${esc(t('study.focus', { topic: topicName(topic) }))}</p>` : ''}
      ${questionHTML(fact, item, { confidence: true, order: cur.order })}
      <div id="fb"></div>`);

  const showQuestion = (given = null) => {
    const fact = factOf(cur.id), item = fact.items[cur.ii];
    page(fact, item);
    const off = wireQuestion(item, (right, given, sure) => {
      off();
      const outcome = right ? (sure ? 'sure-right' : 'guess-right') : (sure ? 'sure-wrong' : 'guess-wrong');
      srs.grade(S.progress, fact, outcome);
      const xp = { 'sure-right': 10, 'guess-right': 5, 'guess-wrong': 2, 'sure-wrong': 2 }[outcome];
      store.tick(S.progress, xp);
      save();
      tally.n++; tally.xp += xp; if (right) tally.right++; if (outcome === 'sure-wrong') tally.surprise++;
      // Mistakes and lucky guesses come back later in this same session.
      const r = retries.get(fact.id) || 0;
      if (outcome !== 'sure-right' && r < 2) {
        retries.set(fact.id, r + 1);
        queue.splice(Math.min(queue.length, outcome === 'guess-right' ? queue.length : 3), 0, fact);
        total++;
      }
      cur.result = { outcome, given, xp, right };
      markChoices(item, given);
      showFeedback(fact, item);
    }, { confidence: true, given });
    S.cleanup = off;
  };

  const showFeedback = (fact, item) => {
    const { outcome, xp, right } = cur.result;
    const head = {
      'sure-right': ['good', t('fb.sureRight')],
      'guess-right': ['meh', t('fb.guessRight')],
      'guess-wrong': ['bad', t('fb.guessWrong')],
      'sure-wrong': ['surprise', t('fb.sureWrong')],
    }[outcome];
    $('#fb').innerHTML = `
      <section class="card feedback ${head[0]}">
        <h3>${esc(head[1])} <span class="xp">+${xp} XP</span></h3>
        ${right ? '' : `<p class="answer">${esc(t('fb.answer'))} <b>${esc(answerText(item))}</b></p>`}
        ${explainHTML(fact)}
        <button class="btn primary big" id="cont">${esc(t('q.continue'))}</button>
      </section>`;
    updateChrome();
    const cont = $('#cont');
    cont.focus({ preventScroll: true });
    cont.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    cont.addEventListener('click', next);
  };

  S.relang = () => {
    if (!cur) return;
    if (!cur.result) return showQuestion(pendingAnswer());
    const fact = factOf(cur.id), item = fact.items[cur.ii];
    page(fact, item);
    lockAnswered(item, cur.result.given);
    showFeedback(fact, item);
  };

  const finish = () => {
    S.relang = finish;
    const after = srs.readiness(S.progress, S.facts, S.state.exam).pass;
    const newly = S.facts.filter(f => (S.progress.facts[f.id]?.b || 0) >= srs.MASTERED_BOX && !masteredBefore.has(f.id)).length;
    const delta = Math.round((after - before) * 100);
    render(`
      <section class="card done center">
        <div class="big-emoji">🎉</div>
        <h1>${esc(t('done.title'))}</h1>
        <div class="stats3">
          <div><b>${tally.n ? pct(tally.right / tally.n) : '–'}</b><small>${esc(t('done.accuracy'))}</small></div>
          <div><b>+${tally.xp}</b><small>XP</small></div>
          <div><b>${pct(after)}</b><small>${esc(t('home.passChance'))} ${delta ? `(${delta > 0 ? '+' : ''}${delta})` : ''}</small></div>
        </div>
        ${newly ? `<p>🏅 ${esc(t('done.mastered', { n: newly }))}</p>` : ''}
        ${tally.surprise ? `<p class="muted">${esc(t('done.surprise', { n: tally.surprise }))}</p>` : ''}
        <p class="muted small">${esc(t('done.spacing'))}</p>
        <div class="row gap">
          <a class="btn primary big" href="#/study${topic ? '/' + topic : ''}" id="again">${esc(t('done.again'))}</a>
          <a class="btn big" href="#/">${esc(t('done.home'))}</a>
        </div>
      </section>`);
    $('#again').addEventListener('click', e => { if (location.hash === e.currentTarget.getAttribute('href')) { e.preventDefault(); viewStudy(topic); } });
  };
  next();
}

function markChoices(item, given) {
  app.querySelectorAll('.choice').forEach(b => {
    const v = b.dataset.v;
    const isAns = item.type === 'tf' ? v === String(item.answer) : Number(v) === item.answer;
    if (isAns) b.classList.add('right');
    else if (v === String(given)) b.classList.add('wrong');
  });
  const inp = $('.numin');
  if (inp) inp.classList.add(Math.abs(parseFloat(String(given).replace(',', '.')) - item.answer) < 1e-9 ? 'right' : 'wrong');
}

// ---------- sign sprint ----------

function viewSprint() {
  const signFacts = S.facts.filter(f => f.sign && f.items.some(i => i.type === 'sign'));
  render(`
    <section class="card center">
      <div class="big-emoji">🛑⚠️➡️</div>
      <h1>${esc(t('sprint.title'))}</h1>
      <p>${esc(t('sprint.intro', { n: signFacts.length }))}</p>
      <p class="muted">${esc(t('sprint.best', { n: S.progress.best.sprint || 0 }))}</p>
      <button class="btn primary big" id="go">${esc(t('sprint.go'))}</button>
    </section>`);
  $('#go').addEventListener('click', () => runSprint(signFacts));
}

function runSprint(signFacts) {
  const SECONDS = 60;
  let score = 0, combo = 0, deck = srs.shuffle(signFacts), missed = [], cur = null;
  const end = Date.now() + SECONDS * 1000;
  let timer;
  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const el = $('.timer i'); if (el) el.style.width = `${left / (SECONDS * 1000) * 100}%`;
    const n = $('#tleft'); if (n) n.textContent = Math.ceil(left / 1000);
    if (left <= 0) stop();
  };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    S.cleanup && S.cleanup(); S.cleanup = null;
    const best = Math.max(score, S.progress.best.sprint || 0);
    const isBest = score > (S.progress.best.sprint || 0);
    S.progress.best.sprint = best;
    store.tick(S.progress, score * 2);
    save();
    S.relang = () => results(best, isBest);
    results(best, isBest);
  };
  const results = (best, isBest) => {
    const uniq = [...new Set(missed)].map(factOf);
    render(`
      <section class="card center">
        <div class="big-emoji">${isBest ? '🏆' : '⏱️'}</div>
        <h1>${esc(t('sprint.score', { n: score }))}</h1>
        <p>${esc(isBest ? t('sprint.newBest') : t('sprint.best', { n: best }))}</p>
        <div class="row gap"><button class="btn primary big" id="again">${esc(t('done.again'))}</button><a class="btn big" href="#/">${esc(t('done.home'))}</a></div>
      </section>
      ${uniq.length ? `<h2 class="section">${esc(t('sprint.review'))}</h2>
        ${uniq.map(f => `<div class="card signrow"><img src="${signSrc(f.sign)}" alt=""><div><b>${esc(answerText(f.items.find(i => i.type === 'sign')))}</b><p class="small muted">${esc(f.fact)}</p></div></div>`).join('')}` : ''}`);
    $('#again').addEventListener('click', () => runSprint(signFacts));
  };
  const show = () => {
    if (!deck.length) deck = srs.shuffle(signFacts);
    const next = deck.pop();
    const ii = next.items.findIndex(i => i.type === 'sign');
    cur = { id: next.id, ii, order: choiceOrder(next.items[ii]), answered: false };
    draw();
  };
  const draw = () => {
    const fact = factOf(cur.id), item = fact.items[cur.ii];
    render(`
      <div class="sprintbar"><div class="timer"><i></i></div><span><b id="tleft">${SECONDS}</b>s</span><span>✔ ${score}</span>${combo >= 3 ? `<span class="combo">🔥×${combo}</span>` : ''}</div>
      ${questionHTML(fact, item, { order: cur.order })}`, false);
    tick();
    S.cleanup && S.cleanup();
    if (cur.answered) return lockAnswered(item, null);
    S.cleanup = wireQuestion(item, right => {
      cur.answered = true;
      markChoices(item, null);
      if (right) { score++; combo++; }
      else { combo = 0; missed.push(fact.id); srs.grade(S.progress, fact, 'guess-wrong'); }
      setTimeout(() => { if (!stopped && Date.now() < end) show(); }, right ? 250 : 1100);
    }, { instant: true });
  };
  let stopped = false;
  S.relang = () => { if (!stopped) draw(); };
  show();
  timer = setInterval(tick, 200);
  // Leaving the page mid-sprint stops the clock (route() only knows about the key handler).
  window.addEventListener('hashchange', () => { stopped = true; clearInterval(timer); }, { once: true });
}

// ---------- mock exam ----------

function viewExam() {
  const ex = S.state.exam;
  const history = S.progress.exams.slice(-5).reverse();
  render(`
    <section class="card center">
      <div class="big-emoji">📝</div>
      <h1>${esc(t('exam.title'))}</h1>
      <p>${esc(t('exam.intro', { n: ex.questions, max: ex.maxMisses }))}</p>
      <button class="btn primary big" id="go">${esc(t('exam.go'))}</button>
    </section>
    ${history.length ? `<h2 class="section">${esc(t('exam.history'))}</h2>
      <div class="card">${history.map(h => `<div class="row"><span>${esc(h.date)}</span><span class="${h.pass ? 'okc' : 'badc'}">${h.score}/${h.of} ${h.pass ? '✔' : '✘'}</span></div>`).join('')}</div>` : ''}`);
  $('#go').addEventListener('click', runExam);
}

function runExam() {
  const ex = S.state.exam;
  const qs = srs.buildExam(S.facts, ex.questions)
    .map(({ fact, item }) => ({ id: fact.id, ii: fact.items.indexOf(item), order: choiceOrder(item) }));
  const answers = [];
  let i = 0;
  const show = (pending = null) => {
    const q = qs[i], fact = factOf(q.id), item = fact.items[q.ii];
    render(`
      <div class="progress"><i style="width:${i / qs.length * 100}%"></i></div>
      <p class="muted small center">${esc(t('exam.q', { i: i + 1, n: qs.length }))}</p>
      ${questionHTML(fact, item, { order: q.order, goLabel: i + 1 < qs.length ? t('q.next') : t('exam.finish') })}`);
    S.cleanup = wireQuestion(item, (right, given) => {
      S.cleanup(); S.cleanup = null;
      answers.push({ id: q.id, ii: q.ii, right, given });
      i++;
      i < qs.length ? show() : finish();
    }, { given: pending });
  };
  const finish = () => {
    const wrong = answers.filter(a => !a.right);
    const pass = wrong.length <= ex.maxMisses;
    for (const a of wrong) srs.grade(S.progress, factOf(a.id), 'guess-wrong');
    S.progress.exams.push({ date: store.today(), score: answers.length - wrong.length, of: answers.length, pass });
    store.tick(S.progress, 50 + (pass ? 100 : 0));
    save();
    S.relang = results;
    results();
    if (pass) confetti();
  };
  const results = () => {
    const wrong = answers.filter(a => !a.right).map(a => ({ ...a, fact: factOf(a.id), item: factOf(a.id).items[a.ii] }));
    const score = answers.length - wrong.length;
    const pass = wrong.length <= ex.maxMisses;
    render(`
      <section class="card center ${pass ? 'passed' : ''}">
        <div class="big-emoji">${pass ? '🎉' : '💪'}</div>
        <h1>${esc(pass ? t('exam.pass') : t('exam.fail'))}</h1>
        <p class="score">${score} / ${answers.length}</p>
        <p class="muted">${esc(t('exam.missed', { n: wrong.length, max: ex.maxMisses }))}</p>
        <div class="row gap"><a class="btn primary big" href="#/study">${esc(t('exam.studyMisses'))}</a><a class="btn big" href="#/">${esc(t('done.home'))}</a></div>
      </section>
      ${wrong.length ? `<h2 class="section">${esc(t('exam.review'))}</h2>` + wrong.map(a => `
        <section class="card review">
          ${a.item.type === 'sign' ? `<img class="sign small" src="${signSrc(a.fact.sign)}" alt="">` : ''}
          <p class="qtext small">${esc(a.item.q)}</p>
          <p class="badc">✘ ${esc(givenText(a.item, a.given))}</p>
          <p class="okc">✔ ${esc(answerText(a.item))}</p>
          ${explainHTML(a.fact)}
        </section>`).join('') : ''}`);
  };
  S.relang = () => show(pendingAnswer());
  show();
}

function givenText(item, given) {
  if (item.type === 'tf') return given === 'true' ? t('q.true') : t('q.false');
  if (item.type === 'num') return given;
  return item.choices[Number(given)];
}

// ---------- topics ----------

function viewTopics() {
  const p = S.progress;
  render(`
    <h1 class="pagetitle">${esc(t('topics.title'))}</h1>
    <p class="muted center">${esc(t('topics.sub'))}</p>
    <section class="topicgrid">
      ${S.state.topics.map(id => {
        const fs = S.facts.filter(f => f.topic === id);
        if (!fs.length) return '';
        const m = srs.mastery(p, fs);
        const seen = fs.filter(f => p.facts[f.id]).length;
        return `<a class="card topic" href="#/topic/${id}" style="--p:${m}">
          <span class="tring"><span>${pct(m)}</span></span>
          <b>${esc(topicName(id))}</b>
          <small>${seen}/${fs.length} ${esc(t('topics.seen'))}</small></a>`;
      }).join('')}
    </section>`);
}

function viewTopic(id) {
  const p = S.progress;
  const fs = S.facts.filter(f => f.topic === id).sort((a, b) => a.page - b.page);
  const dot = f => { const b = p.facts[f.id]?.b; return b === undefined ? 'new' : b >= srs.MASTERED_BOX ? 'mastered' : b >= 2 ? 'learning' : 'weak'; };
  render(`
    <a href="#/topics" class="back">← ${esc(t('topics.title'))}</a>
    <h1 class="pagetitle">${esc(topicName(id))}</h1>
    <div class="row gap center"><a class="btn primary big" href="#/study/${id}">${esc(t('topic.practice'))}</a></div>
    <p class="legend small muted"><span class="dot new"></span>${esc(t('dot.new'))} <span class="dot weak"></span>${esc(t('dot.weak'))} <span class="dot learning"></span>${esc(t('dot.learning'))} <span class="dot mastered"></span>${esc(t('dot.mastered'))}</p>
    ${fs.map(f => `
      <details class="card factrow">
        <summary><span class="dot ${dot(f)}"></span>${f.sign ? `<img class="sign tiny" src="${signSrc(f.sign)}" alt="">` : ''}<span>${esc(f.fact)}</span></summary>
        ${explainHTML(f)}
      </details>`).join('')}`);
}

// ---------- more / settings ----------

function viewMore() {
  const langs = S.state.languages;
  const p = S.progress;
  const badges = earnedBadges();
  render(`
    <h1 class="pagetitle">${esc(t('more.title'))}</h1>
    <section class="card">
      <label class="field"><span>${esc(t('more.language'))}</span>
        <select id="lang">${langs.map(l => `<option value="${l.code}" ${l.code === S.lang ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
      </label>
      ${S.lang !== 'en' ? `<p class="small muted">${esc(t('more.machineTranslated'))}</p>` : ''}
    </section>
    <section class="card">
      <h2>${esc(t('more.badges'))}</h2>
      <div class="badges">${BADGES.map(b => `<div class="bdg ${badges.has(b.id) ? 'on' : ''}" title="${esc(t('badge.' + b.id + '.d'))}"><span>${b.icon}</span><small>${esc(t('badge.' + b.id))}</small></div>`).join('')}</div>
    </section>
    <section class="card">
      <h2>${esc(t('more.about'))}</h2>
      <p>${esc(t('more.aboutText'))}</p>
      <p>${esc(t('more.privacy'))}</p>
      <p><a href="${esc(S.state.handbook.url)}" target="_blank" rel="noopener">📘 ${esc(S.state.handbook.title)} (${esc(S.state.handbook.edition)})</a></p>
      <p><a href="https://github.com/ronniebSimian/license-ready" target="_blank" rel="noopener">💻 ${esc(t('more.source'))}</a></p>
      <p class="small muted">${esc(t('disclaimer', { agency: S.state.agency }))}</p>
    </section>
    <section class="card">
      <h2>${esc(t('more.data'))}</h2>
      <p class="small muted">${esc(t('more.stats', { xp: p.xp, n: Object.keys(p.facts).length, exams: p.exams.length }))}</p>
      <button class="btn danger" id="reset">${esc(t('more.reset'))}</button>
    </section>`);
  $('#lang').addEventListener('change', e => setLanguage(e.target.value));
  $('#reset').addEventListener('click', () => {
    if (confirm(t('more.resetConfirm'))) { store.reset(S.stateId); S.progress = store.load(S.stateId); viewMore(); }
  });
}

const BADGES = [
  { id: 'first', icon: '🚗' },
  { id: 'streak3', icon: '🔥' },
  { id: 'streak7', icon: '☄️' },
  { id: 'sprint15', icon: '🛑' },
  { id: 'sprint25', icon: '⚡' },
  { id: 'exam', icon: '📝' },
  { id: 'signs', icon: '🚸' },
  { id: 'ready', icon: '🎓' },
];
function earnedBadges() {
  const p = S.progress, out = new Set();
  if (Object.keys(p.facts).length) out.add('first');
  const st = Math.max(store.streak(p), longestStreak(p.days));
  if (st >= 3) out.add('streak3');
  if (st >= 7) out.add('streak7');
  if (p.best.sprint >= 15) out.add('sprint15');
  if (p.best.sprint >= 25) out.add('sprint25');
  if (p.exams.some(e => e.pass)) out.add('exam');
  const signs = S.facts.filter(f => f.sign);
  if (signs.length && srs.mastery(p, signs) >= 0.9) out.add('signs');
  if (srs.readiness(p, S.facts, S.state.exam).pass >= 0.9) out.add('ready');
  return out;
}
function longestStreak(days) {
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    const cur = new Date(d + 'T12:00');
    run = prev && (cur - prev) / 864e5 === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = cur;
  }
  return best;
}

function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('i');
    s.style.left = Math.random() * 100 + 'vw';
    s.style.background = ['#ffd23f', '#0b6b3a', '#e63946', '#3a86ff'][i % 4];
    s.style.animationDelay = Math.random() * 0.6 + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3000);
}

boot().catch(err => { app.innerHTML = `<p class="card">Something went wrong loading the app: ${esc(err.message)}</p>`; });
