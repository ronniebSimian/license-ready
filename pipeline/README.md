# Build License Ready for your state

The app is state-agnostic. A state is just a folder in `states/` with a config file, a facts file per language,
and sign images. Idaho took one afternoon with Claude Code. Here's the recipe.

You need: [Claude Code](https://claude.com/claude-code) (or any capable AI agent that can read files and PDFs),
`poppler-utils` (`pdftotext`), Node 18+, and **a person willing to check the facts.**

## 1. Get the handbook

Download your state's current driver handbook PDF from the DMV website. Don't commit it to this repo — link to it.

```bash
pipeline/split-pages.sh ~/Downloads/handbook.pdf work/
```

## 2. Extract facts (AI)

Split the handbook into 5–7 chunks by chapter and give one agent each chunk:

> Read `pipeline/1-extract.md` and follow it. Working dir is `work/`. Your CHUNK id is `law`. Your pages are 60–85 (…topics…). Write `facts/law.json`.

Running chunks in parallel takes ~5 minutes. Expect 300–400 facts for a full handbook.

## 3. Review facts (AI, then human)

Merge chunks, split by topic into 3 groups, and give each to a fresh agent with `pipeline/2-review.md`.
The reviewer re-checks every fact and every answer choice against the cited page. In our Idaho run this
caught ~30 real problems (distractors that were arguably correct, overstated rules, missing exceptions).

**Then a human reads every fact.** The topic pages in the app (Topics → any topic) are a convenient way to do it,
with a link to the handbook page next to each fact. Kids will learn these as law.

## 4. Translate (AI)

`pipeline/3-translate.md` gives the rules: never change a number or a rule, never reorder choices,
keep sign text in English. One agent per language. Then `node tools/build.mjs` checks every translation
lines up item-for-item with English, so answer keys can't drift.

## 5. Sign images

Facts with a `sign` field need `states/<state>/signs/<code>.svg`. US signs follow the federal MUTCD and are
public domain; Wikimedia Commons has them as `MUTCD_<code>.svg`:

```bash
curl -L -o states/<state>/signs/R1-1.svg "https://commons.wikimedia.org/wiki/Special:FilePath/MUTCD_R1-1.svg"
```

Go slowly (Commons rate-limits), and check each file is really an SVG.

## 6. Configure and build

Copy `states/idaho/state.json`, edit the name, agency, handbook URL, exam size and pass mark
(Idaho: 40 questions, miss at most 6), and languages. Then:

```bash
node tools/build.mjs     # validates everything and refreshes the offline cache list
```

Open a pull request, or fork and publish your own copy with GitHub Pages.

## Copyright, briefly

Facts and laws aren't copyrightable; a handbook's wording and pictures can be. So: write questions in your own
words, cite the page, link to the official PDF, use public-domain MUTCD sign art, and don't reuse the handbook's
own practice questions. Not legal advice — when in doubt, email your DMV. They're usually happy to hear about it.
