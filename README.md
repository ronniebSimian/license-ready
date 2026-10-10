# Permit Trainer

**A free, open-source study app for the driver's license knowledge test — built the way memory actually works.**

Starting with Idaho (Class D), in English, Español, العربية, 中文, Русский and Kiswahili.
Works on phones and desktops, installs to the home screen, and runs offline.

**Use it:** https://ronniebsimian.github.io/permit-trainer/

## Why it's different

Most practice sites show a question, four answers, and a score. That trains recognition. This app is built on
learning research instead:

| Technique | What it looks like |
|---|---|
| **Retrieval practice** | You answer *before* you're told — even a wrong guess primes the memory. |
| **Confidence check** | "I'm sure" or "Just guessing"? Lucky guesses don't count as knowing. Confident mistakes get flagged and come back soonest (the *hypercorrection effect*). |
| **Spaced repetition** | Each fact returns just before you'd forget it — minutes, then hours, then days. |
| **Interleaving** | Topics are mixed, so you learn to recognize *which* rule applies. |
| **Desirable difficulty** | New facts start as true/false; as you improve they become typed numbers and real-world scenarios. |
| **Elaboration** | Every answer explains *why*, with a memory hook and a link to the handbook page. |

Plus a 60-second **Sign Sprint**, a **Mock Exam** that matches the real format (Idaho: 40 questions, miss at most 6),
a **Topic Map**, streaks, XP and badges. A live **pass chance** estimates how you'd do today.

## Privacy

No accounts, no analytics, no server. Progress is stored only in your browser.

## Add your state

See [`pipeline/README.md`](pipeline/README.md). The app is state-agnostic; a state is a folder of JSON plus sign images,
built with an AI-assisted extract → review → translate pipeline and checked by a human.

## Develop

No build step, no dependencies. Serve the folder and open it:

```bash
python3 -m http.server 8000
node tools/build.mjs   # after changing content: validates and refreshes the offline cache list
```

```
index.html, css/, js/        the app (vanilla JS modules)
i18n/<lang>.json             interface strings
states/<state>/state.json    exam format, handbook link, topics, languages
states/<state>/facts.<lang>.json
states/<state>/signs/        MUTCD sign SVGs (public domain, via Wikimedia Commons)
pipeline/                    how to build a new state with AI
```

## Disclaimer

Not affiliated with any state DMV. Facts are paraphrased from the official handbook and cite their page;
the handbook and state law always win. Translations were made with AI. Found a mistake? Please open an issue.

## License

Code: [MIT](LICENSE). Content (facts, questions, translations): [CC BY 4.0](CONTENT-LICENSE.md).
Road sign images: public domain (US MUTCD).

Made by [ronnieb](https://github.com/ronniebSimian).
