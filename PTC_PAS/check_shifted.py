import json, os

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\extracted_tqt.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

for idx, r in enumerate(raw['data_rows'][2:]):
    col35 = str(r.get('Col_35') or '')
    if '2026' in col35:
        print(f"Row {idx+3}: Col_34='{r.get('Col_34')}', Col_35='{col35}', Col_36='{r.get('Col_36')}'")
