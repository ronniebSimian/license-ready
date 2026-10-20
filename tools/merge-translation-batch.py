# Replace some facts in an existing translation (e.g. after editing a batch of English facts).
# usage: python3 -I tools/merge-translation-batch.py <state> <lang> <translated batch.json>
# The batch is a JSON array of complete translated facts. Answers, types and choice counts are checked against English.
import json, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
state, lang, batch_path = sys.argv[1:4]
en = {f['id']: f for f in json.load(open(f'{root}/states/{state}/facts.en.json'))}
path = f'{root}/states/{state}/facts.{lang}.json'
facts = json.load(open(path))
pos = {f['id']: i for i, f in enumerate(facts)}
for g in json.load(open(batch_path)):
    f = en[g['id']]
    for k in ('topic', 'page', 'weight', 'sign'):
        if g.get(k) != f.get(k): sys.exit(f"{lang}/{g['id']}: {k} differs from English")
    if bool(g.get('example')) != bool(f.get('example')): sys.exit(f"{lang}/{g['id']}: example presence differs")
    if len(g['items']) != len(f['items']): sys.exit(f"{lang}/{g['id']}: item count differs")
    for a, b in zip(f['items'], g['items']):
        if a['type'] != b['type'] or a['answer'] != b['answer'] or len(a.get('choices', [])) != len(b.get('choices', [])):
            sys.exit(f"{lang}/{g['id']}: an item doesn't match English")
    facts[pos[g['id']]] = g
json.dump(facts, open(path, 'w'), ensure_ascii=False, indent=1)
print(f'{lang}: merged {len(json.load(open(batch_path)))} facts')
