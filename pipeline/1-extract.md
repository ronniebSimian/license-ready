# Fact extraction spec

You are turning part of your state's driver handbook into "facts" for a spaced-repetition
study app for teenagers. Page text lives in pages/pNNN.txt (NNN = printed page number = PDF page).
The original PDF is manual/m.pdf — use the Read tool with `pages` to LOOK at pages that contain signs,
diagrams or tables, since text extraction loses them.

## Output
Write a JSON array to facts/<CHUNK>.json. Validate with: python3 -c "import json,sys;json.load(open(sys.argv[1]))" facts/<CHUNK>.json

Each fact:
{
  "id": "<CHUNK>-<short-kebab-slug>",          // unique, stable
  "topic": "<one topic id from the list below>",
  "page": 79,                                   // handbook page where the fact is stated
  "fact": "One or two plain sentences stating the rule.",
  "why": "One sentence on the reason behind the rule, so it makes sense instead of being memorized. Only use reasoning that is consistent with the handbook; keep it common-sense.",
  "hook": "Optional short memory aid, ONLY if genuinely useful (e.g. 'Red + octagon = full stop; only STOP signs have 8 sides'). Omit the key otherwise.",
  "example": "Optional 2-3 sentence illustration in second person ('You are arrested for DUI ... The officer gives you ...'), ONLY for facts that are hard to picture: legal or penalty processes, jargon, multi-step situations. Omit it for simple rules. See rule 8.",
  "weight": 1|2|3,                              // 3 = very likely on the test (numbers, right-of-way, signs, alcohol, GDL); 1 = minor
  "sign": "R1-1",                               // OPTIONAL: MUTCD sign code if the fact is about a specific standard sign
  "signDesc": "Red octagon, white STOP text",  // REQUIRED when "sign" is present
  "items": [ ...2 to 4 question items... ]
}

Item types (use the right ones; every fact needs at least one "mc" or "scenario"):
- {"type":"mc", "q":"...", "choices":["correct or not", "...", "...", "..."], "answer": 0}
- {"type":"scenario", "q":"A short realistic situation in 2nd person, then a question.", "choices":[4], "answer": i}
- {"type":"tf", "q":"A statement.", "answer": true|false}    // make about half of them false, with a plausible wrong claim
- {"type":"num", "q":"Question whose answer is a single number.", "answer": 100, "unit": "feet"}  // REQUIRED for every fact that contains a number someone must remember
- {"type":"sign", "q":"What does this sign mean?", "choices":[4], "answer": i}   // only when fact has "sign"

Choice rules: exactly 4 choices; distractors must be plausible common confusions (nearby numbers, rules from
other situations); never "all/none of the above" or "both A and B" (choices get shuffled); keep choices similar length.

## Topic ids (use exactly these)
licensing, equipment, signs, signals-markings, right-of-way, speed-turns, passing-following, parking,
freeway, safe-driving, sharing, conditions, emergencies, alcohol

## Rules
1. ORIGINAL WORDING. Do not copy handbook sentences verbatim; restate. Facts aren't copyrighted, prose is.
2. Do NOT reuse or paraphrase the handbook's own practice test questions (usually at the back of the handbook).
3. ACCURACY ABOVE ALL. Only state what your pages say. Kids will learn these as law. If unsure, leave it out.
   Never pull in numbers from other states or general knowledge.
4. Skip pure admin trivia unlikely on a knowledge test (fees, document lists, STAR card, donor/veteran
   designation, address change paperwork). Do cover anything rule-like: ages, permit/GDL limits, deadlines, penalties, numbers.
5. Plain language, ~8th-grade reading level, no idioms or slang — this will be machine-translated into 5 languages.
6. One rule per fact. Split compound rules.
6b. Explain every acronym the first time it appears in each text field (fact, why, hook, question, choice), using the
   handbook's own expansion: "DUI (driving under the influence)", "BAC (blood alcohol concentration)". Learners may be
   new to the US. Don't expand English sign text (STOP, ROAD CLOSED) or units (mph). Never expand an acronym only in the
   correct choice — that makes it the longest option and gives the answer away. (tools/expand-acronyms.py can do a first pass.)
8. EXAMPLES. Spelling out an acronym doesn't make a legal term meaningful ("ALS (administrative license suspension)" still
   means nothing to most learners). When a fact describes a process, a penalty, or a situation with several steps, add an
   "example" that walks through what it looks like for "you". Rules: use only what the cited page says; use NO number the
   "fact" doesn't already state (tools/build.mjs fails the build otherwise); no names, no idioms; expand acronyms at first use.
   Expect roughly 10-20% of facts to need one. Also prefer plain words in question stems ("a failed alcohol test")
   over the legal term ("an evidentiary test"), as long as the stem doesn't give away the answer.
9. When done, reply with: count of facts, count by topic, and any handbook passages you found ambiguous or contradictory.
