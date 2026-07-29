import openpyxl, glob, os, json

pas_dir = r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS'
files = glob.glob(os.path.join(pas_dir, '*.xlsx'))
excel_path = files[0]

wb = openpyxl.load_workbook(excel_path, data_only=True)

out = {}

# 1. Inspect Sheet Data
data_sheet = wb['Data']
headers = []
for col in range(1, data_sheet.max_column + 1):
    val = data_sheet.cell(1, col).value
    headers.append(str(val) if val is not None else f'Col_{col}')

data_rows = []
for row in range(2, data_sheet.max_row + 1):
    row_vals = [data_sheet.cell(row, col).value for col in range(1, data_sheet.max_column + 1)]
    if any(v is not None for v in row_vals):
        row_dict = {}
        for h, v in zip(headers, row_vals):
            if isinstance(v, (int, float)):
                row_dict[h] = v
            elif v is None:
                row_dict[h] = None
            else:
                row_dict[h] = str(v).strip()
        data_rows.append(row_dict)

out['data_headers'] = headers
out['data_count'] = len(data_rows)
out['data_rows'] = data_rows

# 2. Inspect Sheet Báo cáo if present
report_rows = []
if 'Báo cáo' in wb.sheetnames:
    rep_sheet = wb['Báo cáo']
    for row in range(1, rep_sheet.max_row + 1):
        row_vals = [rep_sheet.cell(row, col).value for col in range(1, rep_sheet.max_column + 1)]
        if any(v is not None for v in row_vals):
            report_rows.append({
                'row': row,
                'vals': [str(v) if v is not None else '' for v in row_vals]
            })
out['report_rows'] = report_rows

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\extracted_tqt.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(data_rows)} data rows and {len(headers)} headers.")
