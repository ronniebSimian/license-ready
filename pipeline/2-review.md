# Accuracy review — state study facts

Teenagers will learn these facts as state law, so a wrong fact is worse than a missing one.
Working dir: your work/ folder (from split-pages.sh). Spec for the fact format: 1-extract.md (read it).
Source text: pages/pNNN.txt (3-digit zero-padded, printed page = PDF page). PDF: manual/m.pdf (Read tool with `pages` for images/charts).
facts/index.txt lists EVERY fact in the project (all groups) as one line each, for duplicate spotting.

Your job, for every fact in your input file:
1. Open the cited page (and neighbors if needed) and verify the fact, "why", "hook", and EVERY item's correct answer
   against the handbook. Fix anything wrong, overstated, or not supported. Fix the page number if wrong.
   If a fact can't be supported, delete it.
2. Check each item: the marked answer must be unambiguously correct, every distractor must be unambiguously wrong
   under the handbook (a distractor that is also arguably right is a bug — rewrite it). True/false statements must be
   clearly true or clearly false. "num" answers must be the single number the question asks for, unit given.
3. Delete duplicates within your file (keep the better one; merge good items into it). For duplicates of facts in
   OTHER groups (see index.txt), don't delete — list them in your report.
4. Wording: plain, ~8th grade, no idioms (it will be translated). No verbatim handbook sentences.
5. Keep the correct answer at index 0 is NOT required; any index is fine (the app shuffles).
6. Don't add new facts unless a clearly test-worthy rule on your pages is missing — then add it (same id prefix rules).

Write the corrected array to facts/out-<GROUP>.json and validate it parses with python3 -I.
Report back: facts in/out, how many corrected (list id + one-line what changed for substantive corrections),
deleted ids, and cross-group duplicate pairs.
