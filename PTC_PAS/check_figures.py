import json

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\clean_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

contracts = data['contracts']

total_gt_hd = sum(c['tong_gt_hd_gomvat'] for c in contracts)
total_workdone = sum(c['workdone_gomvat'] for c in contracts)
total_paid = sum(c['da_thanh_toan_gomvat'] for c in contracts)
total_unpaid = sum(c['cong_no_chua_tt_gomvat'] for c in contracts)

status_counts = {}
for c in contracts:
    st = c['tinh_trang_quyet_toan']
    status_counts[st] = status_counts.get(st, 0) + 1

project_counts = {}
for c in contracts:
    pj = c['du_an'] or 'Khác'
    project_counts[pj] = project_counts.get(pj, 0) + 1

priority_counts = {}
for c in contracts:
    pr = c['phan_loai_uu_tien'] or 'Chưa phân loại'
    priority_counts[pr] = priority_counts.get(pr, 0) + 1

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\figures_output.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total Contracts: {len(contracts)}\n")
    out.write(f"Total Contract Value (Gồm VAT): {total_gt_hd / 1e9:,.2f} tỷ VNĐ\n")
    out.write(f"Total Workdone (Gồm VAT): {total_workdone / 1e9:,.2f} tỷ VNĐ\n")
    out.write(f"Total Paid (Gồm VAT): {total_paid / 1e9:,.2f} tỷ VNĐ\n")
    out.write(f"Total Unpaid Outstanding (Gồm VAT): {total_unpaid / 1e9:,.2f} tỷ VNĐ\n")

    out.write("\n--- Status Breakdown ---\n")
    for k, v in status_counts.items():
        out.write(f"  {k}: {v} hợp đồng\n")

    out.write("\n--- Project Breakdown ---\n")
    for k, v in project_counts.items():
        out.write(f"  {k}: {v} hợp đồng\n")

    out.write("\n--- Priority Breakdown ---\n")
    for k, v in priority_counts.items():
        out.write(f"  {k}: {v} hợp đồng\n")
