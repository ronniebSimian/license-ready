# Apply a batch of English content edits to states/<state>/facts.en.json.
# usage: python3 -I tools/apply-content-edits.py <state> <edits.json>
# edits.json: {fact_id: {"fact"|"why"|"hook"|"example": text, "items": {"<index>": {"q": text, "choices": [...]}}}}
# Only text changes: answers, types and choice order are never touched, so translations stay aligned.
import json, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
state, edits_path = sys.argv[1], sys.argv[2]
path = f'{root}/states/{state}/facts.en.json'
facts = json.load(open(path))
by_id = {f['id']: f for f in facts}
edits = json.load(open(edits_path))
for fid, e in edits.items():
    f = by_id[fid]
    for k in ('fact', 'why', 'hook', 'example'):
        if k in e: f[k] = e[k]
    for i, ie in e.get('items', {}).items():
        it = f['items'][int(i)]
        if 'q' in ie: it['q'] = ie['q']
        if 'choices' in ie:
            assert len(ie['choices']) == len(it['choices']), fid
            it['choices'] = ie['choices']
# keep "example" right after "why"/"hook" for readable diffs
order = ['id', 'topic', 'page', 'fact', 'why', 'hook', 'example', 'weight', 'sign', 'signDesc', 'items']
facts = [{k: f[k] for k in order if k in f} | {k: v for k, v in f.items() if k not in order} for f in facts]
json.dump(facts, open(path, 'w'), ensure_ascii=False, indent=1)
open(path, 'a').write('\n') if not open(path).read().endswith('\n') else None
print(f'{state}: applied {len(edits)} fact edits')
