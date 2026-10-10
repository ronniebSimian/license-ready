# Adds "(meaning)" after the first use of each acronym in every text field of the English facts.
# usage: python3 -I tools/expand-acronyms.py states/idaho/facts.en.json changes.json [--dry]
import json, re, sys
EXP = {
  'DUI': 'driving under the influence', 'BAC': 'blood alcohol concentration', 'GDL': "Graduated Driver's License",
  'ALS': 'administrative license suspension', 'ABS': 'anti-lock braking system', 'HAWK': 'High-Intensity Activated crossWalk',
  'ITD': 'Idaho Transportation Department', 'RR': 'railroad', 'SPUI': 'single point urban interchange',
  'DDI': 'diverging diamond interchange', 'SR-22': 'proof of insurance', 'XING': 'crossing',
  'ID': 'identification', 'GPS': 'Global Positioning System', 'SUV': 'sport utility vehicle', 'DMV': 'Division of Motor Vehicles',
}
pat = re.compile(r'(?<![\w(-])(' + '|'.join(sorted(map(re.escape, EXP), key=len, reverse=True)) + r')(?![\w-])')

def expand(text, skip=()):
    done = set(skip)
    def rep(m):
        a = m.group(1)
        if a in done: return a
        done.add(a)
        after = text[m.end():m.end() + 3]
        before = text[max(0, m.start() - 1):m.start()]
        if after.startswith(' (') or after.startswith('(') or before == '(': return a  # already explained
        if EXP[a].lower() in text.lower(): return a                                     # meaning already in the text
        if a == 'SR-22' and ('insurance' in text.lower() or 'financial responsibility' in text.lower()): return a
        return f'{a} ({EXP[a]})'
    return pat.sub(rep, text)

path, out = sys.argv[1], sys.argv[2]
facts = json.load(open(path)); changes = []; flags = []
for f in facts:
    for k in ('fact', 'why', 'hook'):
        if f.get(k):
            n = expand(f[k])
            if n != f[k]: changes.append({'id': f['id'], 'field': k, 'old': f[k], 'new': n}); f[k] = n
    for i, it in enumerate(f['items']):
        n = expand(it['q'])
        if n != it['q']: changes.append({'id': f['id'], 'field': f'items[{i}].q', 'old': it['q'], 'new': n}); it['q'] = n
        inq = set(pat.findall(it['q']))
        chs = it.get('choices', [])
        for j, ch in enumerate(chs):
            n = expand(ch, skip=inq)
            if n != ch:
                changes.append({'id': f['id'], 'field': f'items[{i}].choices[{j}]', 'old': ch, 'new': n}); chs[j] = n
                hits = [c for c in chs if pat.search(c)]
                if len(hits) < len(chs) and j == it['answer']: flags.append((f['id'], i, n))
json.dump(changes, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(changes), 'changes')
for fl in flags: print('CHECK answer-only expansion:', fl)
if '--dry' not in sys.argv: json.dump(facts, open(path, 'w'), ensure_ascii=False, indent=1)
