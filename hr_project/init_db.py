import sqlite3
import openpyxl
import os
import re

db_path = 'hr_management.db'
excel_path = 'Data_structure_v1 (5).xlsx'

def init_database():
    if os.path.exists(db_path):
        print(f"Database {db_path} already exists. Deleting it to start fresh...")
        os.remove(db_path)
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        ma_du_an TEXT PRIMARY KEY,
        ten_du_an TEXT,
        khu_vuc TEXT,
        hien_trang_dau_tu TEXT,
        nhom_du_an TEXT,
        quan_ly TEXT,
        ten_phap_ly TEXT,
        ten_thuong_mai TEXT,
        chu_dau_tu TEXT,
        dia_diem_du_an TEXT,
        tong_dien_tich_ha TEXT,
        so_luong_san_pham TEXT,
        nguon_goc_du_an TEXT,
        source_stt TEXT,
        tong_cong_ty TEXT,
        tinh_cu TEXT,
        tinh_moi TEXT,
        loai_hinh TEXT,
        muc_do_uu_tien TEXT,
        updated_at TEXT,
        updated_by TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS employees (
        ma_nhan_vien TEXT PRIMARY KEY,
        ho_ten TEXT,
        email TEXT,
        so_dien_thoai TEXT,
        ngay_vao_lam TEXT
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS org_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_du_an TEXT,
        ma_nhan_vien TEXT,
        ma_oc TEXT,
        name_oc TEXT,
        chuc_danh TEXT,
        tinh_trang TEXT,
        ghi_chu TEXT,
        vung TEXT,
        phan_loai_oc TEXT,
        FOREIGN KEY(ma_du_an) REFERENCES projects(ma_du_an),
        FOREIGN KEY(ma_nhan_vien) REFERENCES employees(ma_nhan_vien)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS project_departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_du_an TEXT,
        ma_oc TEXT,
        name_oc TEXT,
        UNIQUE(ma_du_an, ma_oc),
        FOREIGN KEY(ma_du_an) REFERENCES projects(ma_du_an)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS common_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_nhan_vien TEXT,
        ma_oc TEXT,
        name_oc TEXT,
        chuc_danh TEXT,
        tinh_trang TEXT,
        ghi_chu TEXT,
        FOREIGN KEY(ma_nhan_vien) REFERENCES employees(ma_nhan_vien)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transfer_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_nhan_vien TEXT,
        tu_du_an TEXT,
        den_du_an TEXT,
        tu_phong_ban TEXT,
        den_phong_ban TEXT,
        tu_chuc_danh TEXT,
        den_chuc_danh TEXT,
        ngay_luan_chuyen TEXT,
        ly_do TEXT,
        ghi_chu TEXT,
        FOREIGN KEY(ma_nhan_vien) REFERENCES employees(ma_nhan_vien)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_nhan_vien TEXT,
        ngay_danh_gia TEXT,
        nguoi_danh_gia TEXT,
        diem_so INTEGER,
        nang_luc TEXT, -- JSON
        uu_diem TEXT,
        nhuoc_diem TEXT,
        nhan_xet_chung TEXT,
        FOREIGN KEY(ma_nhan_vien) REFERENCES employees(ma_nhan_vien)
    )
    ''')
    
    conn.commit()
    return conn, cursor

def clean_str(val):
    if val is None:
        return None
    val_str = str(val).strip()
    val_str = val_str.replace('\xa0', ' ')
    val_str = re.sub(r'\s+', ' ', val_str)
    return val_str.strip() if val_str.strip() else None

def is_placeholder_id(val):
    if val is None:
        return True
    val_str = clean_str(val)
    if not val_str:
        return True
    val_lower = val_str.lower()
    placeholders = ['tuyển0', 'tuyển1', 'tuyển', 'không tuyển', 'không tồn tại', 'chưa tuyển', 'tuyến1', 'nan', 'null']
    return val_lower in placeholders

def classify_oc(ma_oc):
    if not ma_oc:
        return 'PHONG_BAN_KHAC'
    ma_oc_clean = str(ma_oc).strip().upper()
    core_prefixes = ('GMD', 'PMD', 'PLP', 'DMD', 'PCD', 'PM')
    for pref in core_prefixes:
        if ma_oc_clean == pref or ma_oc_clean.startswith(pref) or ('.' + pref) in ma_oc_clean or (pref + '.') in ma_oc_clean:
            return 'BAN_DIEU_HANH_CHINH'
    return 'PHONG_BAN_KHAC'

def clean_department_name(name):
    if not name:
        return name
    name_clean = str(name).strip()
    name_upper = name_clean.upper()
    if "BAN ĐIỀU HÀNH DỰ ÁN KHU VỰC" in name_upper:
        return "BAN ĐIỀU HÀNH DỰ ÁN KHU VỰC"
    return name_clean

def main():
    print("Initializing SQLite database with Project Departments configuration support...")
    conn, cursor = init_database()
    
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    
    # 1. Parse projects from 'Dự án' sheet
    print("Reading project data...")
    duan_sheet = wb['Dự án']
    projects_loaded = {}
    
    for r in range(2, duan_sheet.max_row + 1):
        khu_vuc = clean_str(duan_sheet.cell(row=r, column=1).value)
        ma_du_an = clean_str(duan_sheet.cell(row=r, column=10).value) # ITD Check
        ten_du_an = clean_str(duan_sheet.cell(row=r, column=5).value)
        hien_trang_dau_tu = clean_str(duan_sheet.cell(row=r, column=6).value)
        nhom_du_an = clean_str(duan_sheet.cell(row=r, column=7).value)
        quan_ly = clean_str(duan_sheet.cell(row=r, column=8).value)
        
        if not ma_du_an:
            ma_du_an = clean_str(duan_sheet.cell(row=r, column=3).value)
        if not ma_du_an:
            ma_du_an = clean_str(duan_sheet.cell(row=r, column=4).value)
            
        if ma_du_an:
            if not ten_du_an:
                ten_du_an = f"Dự án {ma_du_an}"
            projects_loaded[ma_du_an] = (
                ma_du_an, ten_du_an, khu_vuc, hien_trang_dau_tu,
                nhom_du_an, quan_ly
            )

    # 2. Extract employee names from sheets
    print("Extracting employee profiles...")
    employee_names = {}
    
    # Read from 'Nhân viên(Đã có)'
    if 'Nhân viên(Đã có)' in wb.sheetnames:
        nv_sheet = wb['Nhân viên(Đã có)']
        for r in range(2, nv_sheet.max_row + 1):
            mid = clean_str(nv_sheet.cell(row=r, column=1).value)
            name = clean_str(nv_sheet.cell(row=r, column=2).value)
            if mid and name and not is_placeholder_id(mid):
                employee_names[mid] = name
                
    # Read from Org, Org (2), NS chung to compile names
    for sname in ['Org', 'Org (2)', 'NS chung']:
        if sname in wb.sheetnames:
            sheet = wb[sname]
            for r in range(2, sheet.max_row + 1):
                mid = clean_str(sheet.cell(row=r, column=2).value)
                name = clean_str(sheet.cell(row=r, column=9).value) # OCD
                if mid and name and not is_placeholder_id(mid):
                    if not (name.startswith('Ban điều hành') or name.startswith('Phòng') or name.startswith('Ban Tổng')):
                        if mid not in employee_names:
                            employee_names[mid] = name

    # 3. Read Org sheet allocations & project departments relationships
    print("Reading Org sheet, parsing allocations and extracting departments...")
    org_sheet = wb['Org']
    allocations_list = []
    real_employee_ids = set()
    project_departments_set = set() # (ma_du_an, ma_oc, name_oc)
    
    # Extract HCM.CHC.GMA departments first as the template
    gma_depts = []
    gma_seen_ma_oc = set()
    for r in range(2, org_sheet.max_row + 1):
        ma_du_an = clean_str(org_sheet.cell(row=r, column=1).value)
        if ma_du_an == 'HCM.CHC.GMA':
            ma_oc = clean_str(org_sheet.cell(row=r, column=3).value)
            name_oc = clean_str(org_sheet.cell(row=r, column=4).value)
            name_oc = clean_department_name(name_oc)
            if ma_oc and name_oc and ma_oc not in gma_seen_ma_oc:
                gma_seen_ma_oc.add(ma_oc)
                gma_depts.append({'ma_oc': ma_oc, 'name_oc': name_oc})
    
    for r in range(2, org_sheet.max_row + 1):
        ma_du_an = clean_str(org_sheet.cell(row=r, column=1).value)
        ma_nhan_vien = clean_str(org_sheet.cell(row=r, column=2).value)
        ma_oc = clean_str(org_sheet.cell(row=r, column=3).value)
        name_oc = clean_str(org_sheet.cell(row=r, column=4).value)
        name_oc = clean_department_name(name_oc)
        chuc_danh = clean_str(org_sheet.cell(row=r, column=5).value)
        tinh_trang = clean_str(org_sheet.cell(row=r, column=7).value)
        ghi_chu = clean_str(org_sheet.cell(row=r, column=8).value)
        vung = clean_str(org_sheet.cell(row=r, column=12).value)
        
        if not ma_du_an and not ma_nhan_vien and not chuc_danh:
            continue
            
        if is_placeholder_id(ma_nhan_vien):
            if ma_nhan_vien:
                ma_nhan_vien = clean_str(ma_nhan_vien)
            else:
                ma_nhan_vien = 'Tuyển0'
        else:
            real_employee_ids.add(ma_nhan_vien)
            
        phan_loai_oc = classify_oc(ma_oc)
        allocations_list.append((ma_du_an, ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, vung, phan_loai_oc))
        
        # Save department configuration for this project
        if ma_du_an and ma_oc and name_oc:
            project_departments_set.add((ma_du_an, ma_oc, name_oc))
        
        if ma_du_an and ma_du_an not in projects_loaded:
            projects_loaded[ma_du_an] = (ma_du_an, f"Dự án {ma_du_an}", vung, "Đang hoạt động", None, None)

    # Pre-populate project departments configuration for all projects using GMA as template
    print(f"Pre-populating project departments config for {len(projects_loaded)} projects based on HCM.CHC.GMA...")
    for ma_du_an in projects_loaded.keys():
        for dept in gma_depts:
            project_departments_set.add((ma_du_an, dept['ma_oc'], dept['name_oc']))

    # 4. Read NS chung sheet
    print("Reading NS chung sheet...")
    common_allocs_list = []
    if 'NS chung' in wb.sheetnames:
        ns_sheet = wb['NS chung']
        for r in range(2, ns_sheet.max_row + 1):
            ma_nhan_vien = clean_str(ns_sheet.cell(row=r, column=2).value)
            ma_oc = clean_str(ns_sheet.cell(row=r, column=3).value)
            name_oc = clean_str(ns_sheet.cell(row=r, column=4).value)
            name_oc = clean_department_name(name_oc)
            chuc_danh = clean_str(ns_sheet.cell(row=r, column=5).value)
            tinh_trang = clean_str(ns_sheet.cell(row=r, column=7).value)
            ghi_chu = clean_str(ns_sheet.cell(row=r, column=8).value)
            
            if not ma_nhan_vien and not chuc_danh:
                continue
                
            if is_placeholder_id(ma_nhan_vien):
                if ma_nhan_vien:
                    ma_nhan_vien = clean_str(ma_nhan_vien)
                else:
                    ma_nhan_vien = 'Tuyển0'
            else:
                real_employee_ids.add(ma_nhan_vien)
                
            common_allocs_list.append((ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu))

    # Insert projects
    print(f"Inserting {len(projects_loaded)} projects...")
    for proj in projects_loaded.values():
        cursor.execute('''
            INSERT OR REPLACE INTO projects (
                ma_du_an, ten_du_an, khu_vuc, hien_trang_dau_tu,
                nhom_du_an, quan_ly
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', proj)
        
    # Insert employees
    print(f"Inserting {len(real_employee_ids)} real employees...")
    for emp_id in real_employee_ids:
        name = employee_names.get(emp_id, f"Nhân sự {emp_id}")
        if name == "Chưa có mã dự án":
            name = f"Nhân sự {emp_id}"
        cursor.execute('INSERT OR REPLACE INTO employees VALUES (?, ?, ?, ?, ?)', 
                       (emp_id, name, f"nv.{emp_id}@company.com", "N/A", "2026-01-01"))
                       
    # Insert allocations
    print(f"Inserting {len(allocations_list)} allocations...")
    cursor.executemany('''
        INSERT INTO org_allocations (ma_du_an, ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, vung, phan_loai_oc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', allocations_list)
    
    # Insert project departments configurations
    print(f"Inserting {len(project_departments_set)} project department configurations...")
    cursor.executemany('''
        INSERT OR REPLACE INTO project_departments (ma_du_an, ma_oc, name_oc)
        VALUES (?, ?, ?)
    ''', list(project_departments_set))
    
    # Insert common allocations
    print(f"Inserting {len(common_allocs_list)} common allocations...")
    cursor.executemany('''
        INSERT INTO common_allocations (ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', common_allocs_list)
    
    # Generate mock data
    print("Generating mock transfer history and evaluations...")
    sample_ids = list(real_employee_ids)[:10]
    for emp_id in sample_ids:
        cursor.execute('''
            INSERT INTO evaluations (ma_nhan_vien, ngay_danh_gia, nguoi_danh_gia, diem_so, nang_luc, uu_diem, nhuoc_diem, nhan_xet_chung)
            VALUES (?, '2026-05-15', 'Trần Thị Thanh Vân', 4, 
            '{"chuyen_mon": 4, "giao_tiep": 4, "lam_viec_nhom": 5, "tien_do": 4, "chu_dong": 4}',
            'Hoàn thành tốt công việc, chủ động trong các dự án.',
            'Cần cải thiện thêm kỹ năng báo cáo định kỳ.',
            'Nhân sự có tiềm năng phát triển tốt, hoàn thành đúng hạn các deadline.')
        ''', (emp_id,))
        
    for emp_id in sample_ids[:5]:
        cursor.execute('''
            INSERT INTO transfer_history (ma_nhan_vien, tu_du_an, den_du_an, tu_phong_ban, den_phong_ban, tu_chuc_danh, den_chuc_danh, ngay_luan_chuyen, ly_do, ghi_chu)
            VALUES (?, 'Dự án cũ', 'Dự án hiện tại', 'Phòng kỹ thuật', 'Ban điều hành dự án', 'Chuyên viên', 'Trưởng nhóm', '2026-03-01', 'Luân chuyển công việc theo yêu cầu dự án', 'Bổ nhiệm vai trò mới')
        ''', (emp_id,))
        
    conn.commit()
    conn.close()
    print("Database initialization complete!")

if __name__ == '__main__':
    main()
