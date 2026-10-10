# Merge translated halves into states/<state>/facts.<lang>.json in English order.
# usage: python3 -I tools/merge-translation.py <lang> <part files...>
import json, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lang, parts = sys.argv[1], sys.argv[2:]
en = json.load(open(f'{root}/states/idaho/facts.en.json'))
tr = {}
for p in parts:
    for f in json.load(open(p)): tr[f['id']] = f
missing = [f['id'] for f in en if f['id'] not in tr]
if missing: sys.exit(f'{lang}: missing {len(missing)} facts, e.g. {missing[:3]}')
json.dump([tr[f['id']] for f in en], open(f'{root}/states/idaho/facts.{lang}.json', 'w'), ensure_ascii=False, indent=1)
print(f'{lang}: {len(en)} facts')
