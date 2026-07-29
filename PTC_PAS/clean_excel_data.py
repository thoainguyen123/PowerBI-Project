import json, re

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\extracted_tqt.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

def clean_num(val):
    if val is None or val == '' or val == '-':
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(',', '')
    try:
        return float(s)
    except:
        return 0.0

def clean_str(val):
    if val is None or val == '-' or val == 'None':
        return ''
    return str(val).strip()

def clean_date(val):
    if val is None or val == '' or val == 'None':
        return ''
    s = str(val).strip()
    if ' 00:00:00' in s:
        s = s.replace(' 00:00:00', '')
    return s

clean_records = []
for idx, r in enumerate(raw['data_rows'][2:]): # start from row 3
    so_hd = clean_str(r.get('Col_3'))
    du_an = clean_str(r.get('Col_5'))
    nha_thau = clean_str(r.get('Col_12'))
    if not so_hd and not du_an and not nha_thau:
        continue

    st34 = clean_str(r.get('Col_34')) # tinh_trang_thi_cong
    st35 = clean_str(r.get('Col_35')) # tinh_trang_quyet_toan
    dt36 = clean_date(r.get('Col_36')) # ngay_ky_bb_qt

    # If col35 contains date format (e.g. 2026-04-02), it means it's settled and col35 has the signing date
    if re.match(r'^\d{4}-\d{2}-\d{2}', st35):
        if not dt36:
            dt36 = st35
        st35 = "Đã quyết toán"

    if not st35:
        st35 = "Chưa nộp HSQT"

    rec = {
        'id': idx + 1,
        'stt': clean_str(r.get('Col_1')),
        'so_hd_sap': clean_str(r.get('Col_2')),
        'so_hd_chinh': so_hd,
        'so_plhd': clean_str(r.get('Col_4')),
        'du_an': du_an or 'Chưa xác định',
        'ten_vt_du_an': clean_str(r.get('Col_6')),
        'khu_vuc': clean_str(r.get('Col_7')) or 'Khác',
        'hang_muc': clean_str(r.get('Col_8')),
        'noi_dung_hd': clean_str(r.get('Col_9')),
        'loai_hd': clean_str(r.get('Col_10')),
        'phap_nhan': clean_str(r.get('Col_11')),
        'nha_thau': nha_thau or 'Chưa cập nhật',
        'ngay_hieu_luc': clean_date(r.get('Col_13')),
        'tien_do_ngay': clean_num(r.get('Col_14')),
        'ngay_het_han': clean_date(r.get('Col_15')),
        'gt_hd_chuavat': clean_num(r.get('Col_16')),
        'gt_ps_chuavat': clean_num(r.get('Col_17')),
        'tong_gt_hd_chuavat': clean_num(r.get('Col_18')),
        'vat': clean_num(r.get('Col_19')),
        'tong_gt_hd_gomvat': clean_num(r.get('Col_20')),
        'workdone_chuavat': clean_num(r.get('Col_21')),
        'workdone_gomvat': clean_num(r.get('Col_22')),
        'gt_hd_chua_thuc_hien': clean_num(r.get('Col_23')),
        'cong_no_cpc_gomvat': clean_num(r.get('Col_24')),
        'da_thanh_toan_gomvat': clean_num(r.get('Col_25')),
        'gt_tdsp_gomvat': clean_num(r.get('Col_26')),
        'cong_no_chua_tt_gomvat': clean_num(r.get('Col_27')),
        'tam_ung_chuavat': clean_num(r.get('Col_28')),
        'khau_tru_tam_ung': clean_num(r.get('Col_29')),
        'tam_ung_con_lai': clean_num(r.get('Col_30')),
        'ngay_toc': clean_date(r.get('Col_31')),
        'phan_khu_tong': clean_str(r.get('Col_32')),
        'phan_khu_chitiet': clean_str(r.get('Col_33')),
        'tinh_trang_thi_cong': st34 or 'Đang thực hiện',
        'tinh_trang_quyet_toan': st35,
        'ngay_ky_bb_qt': dt36,
        'pic_xd': clean_str(r.get('Col_37')),
        'pic_mep': clean_str(r.get('Col_38')),
        'pic_site1': clean_str(r.get('Col_39')),
        'pic_site2': clean_str(r.get('Col_40')),
        'ngay_muc_tieu': clean_date(r.get('Col_41')),
        'ly_do_khong_dat': clean_str(r.get('Col_42')),
        'phan_loai_bo_phan': clean_str(r.get('Col_43')),
        'phan_loai_bo_mon': clean_str(r.get('Col_44')),
        'phan_loai_uu_tien': clean_str(r.get('Col_45')) or 'Chưa phân loại',
        'kpi_quyet_toan': clean_str(r.get('Col_46')),
        'sl_tqt': int(clean_num(r.get('Col_47'))),
        'year': clean_str(r.get('Col_48'))
    }
    clean_records.append(rec)

# Calculate summary aggregates for report sheet tab
report_summary = []
for r in raw['report_rows']:
    vals = [v for v in r['vals'] if v != '']
    if len(vals) >= 3 and r['row'] >= 5:
        report_summary.append({
            'khu_vuc': vals[0] if len(vals) > 0 else '',
            'du_an_vt': vals[1] if len(vals) > 1 else '',
            'sl_can_qt': int(clean_num(vals[2])) if len(vals) > 2 else 0,
            'sl_can_qt_2026': int(clean_num(vals[3])) if len(vals) > 3 else 0,
            'hoan_thanh': int(clean_num(vals[4])) if len(vals) > 4 else 0
        })

output_data = {
    'total_contracts': len(clean_records),
    'contracts': clean_records,
    'report_summary': report_summary
}

with open(r'C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\clean_data.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print(f"Cleaned {len(clean_records)} contract records successfully.")
