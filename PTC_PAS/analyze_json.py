import json

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\extracted_tqt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

headers = data['data_headers']
rows = data['data_rows']

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\analysis_summary.txt', 'w', encoding='utf-8') as out:
    out.write("=== HEADERS LIST ===\n")
    for idx, h in enumerate(headers):
        out.write(f"{idx+1}. {h}\n")
    
    out.write("\n=== UNIQUE VALUES PER CATEGORICAL COLUMN ===\n")
    for h in headers:
        sample_val = [r[h] for r in rows if r[h] is not None][:5]
        # check if non-numeric
        non_numeric = any(isinstance(v, str) and not v.replace('.', '', 1).isdigit() for v in sample_val)
        if non_numeric or len(set([str(r[h]) for r in rows if r[h] is not None])) < 20:
            uniques = list(set([str(r[h]) for r in rows if r[h] is not None]))
            out.write(f"\nHeader: '{h}' ({len(uniques)} unique values)\n")
            out.write(f"  Values: {uniques[:15]}\n")

    out.write("\n=== SAMPLE FIRST 3 ROWS ===\n")
    for i, r in enumerate(rows[:3]):
        out.write(f"\n-- Row {i+1} --\n")
        for k, v in r.items():
            out.write(f"  {k}: {v}\n")

    out.write("\n=== REPORT SHEET ROWS ===\n")
    for r in data['report_rows']:
        non_empty = [v for v in r['vals'] if v != '']
        if non_empty:
            out.write(f"Row {r['row']}: {non_empty}\n")

print("Analysis summary written to analysis_summary.txt")
