import sqlite3
import psycopg2
from psycopg2.extensions import quote_ident
import sys
import argparse

def migrate(pg_host, pg_port, pg_user, pg_password, pg_db):
    print(f"Connecting to SQLite database (hr_management.db)...")
    sqlite_conn = sqlite3.connect('hr_management.db')
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    project_overview_columns = {
        'ten_phap_ly': 'TEXT',
        'ten_thuong_mai': 'TEXT',
        'chu_dau_tu': 'TEXT',
        'dia_diem_du_an': 'TEXT',
        'tong_dien_tich_ha': 'TEXT',
        'so_luong_san_pham': 'TEXT',
        'nguon_goc_du_an': 'TEXT',
        'source_stt': 'TEXT',
        'tong_cong_ty': 'TEXT',
        'tinh_cu': 'TEXT',
        'tinh_moi': 'TEXT',
        'loai_hinh': 'TEXT',
        'muc_do_uu_tien': 'TEXT',
        'updated_at': 'TEXT',
        'updated_by': 'TEXT'
    }
    sqlite_cur.execute('PRAGMA table_info(projects)')
    existing_project_columns = {row['name'] for row in sqlite_cur.fetchall()}
    legacy_renames = {
        'trang_thai': 'hien_trang_dau_tu',
        'nhom': 'nhom_du_an',
    }
    for legacy_name, current_name in legacy_renames.items():
        if legacy_name in existing_project_columns and current_name not in existing_project_columns:
            sqlite_cur.execute(
                f'ALTER TABLE projects RENAME COLUMN {legacy_name} TO {current_name}'
            )
            existing_project_columns.remove(legacy_name)
            existing_project_columns.add(current_name)
    for column_name, column_type in project_overview_columns.items():
        if column_name not in existing_project_columns:
            sqlite_cur.execute(
                f'ALTER TABLE projects ADD COLUMN {column_name} {column_type}'
            )
            existing_project_columns.add(column_name)
    sqlite_conn.commit()

    # 1. Connect to default 'postgres' database to check/create the target database
    print(f"Connecting to PostgreSQL (default 'postgres' database) at {pg_host}:{pg_port}...")
    try:
        pg_conn_default = psycopg2.connect(
            host=pg_host,
            port=pg_port,
            user=pg_user,
            password=pg_password,
            database='postgres'
        )
        pg_conn_default.autocommit = True
        pg_cur_default = pg_conn_default.cursor()
        
        # Check if database exists
        pg_cur_default.execute(f"SELECT 1 FROM pg_database WHERE datname = %s", (pg_db,))
        exists = pg_cur_default.fetchone()
        if not exists:
            print(f"Creating database '{pg_db}' in PostgreSQL...")
            pg_cur_default.execute(f"CREATE DATABASE {quote_ident(pg_db, pg_conn_default)}")
        else:
            print(f"Database '{pg_db}' already exists.")
            
        pg_cur_default.close()
        pg_conn_default.close()
    except Exception as e:
        print(f"Error checking/creating PostgreSQL database: {e}")
        sys.exit(1)

    # 2. Connect to the target database
    print(f"Connecting to target PostgreSQL database '{pg_db}'...")
    try:
        pg_conn = psycopg2.connect(
            host=pg_host,
            port=pg_port,
            user=pg_user,
            password=pg_password,
            database=pg_db
        )
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"Error connecting to PostgreSQL database '{pg_db}': {e}")
        sys.exit(1)

    # 3. Define schema tables creation SQL
    tables_sql = {
        'projects': """
            CREATE TABLE IF NOT EXISTS projects (
                ma_du_an VARCHAR(100) PRIMARY KEY,
                ten_du_an TEXT,
                khu_vuc VARCHAR(100),
                hien_trang_dau_tu VARCHAR(100),
                nhom_du_an VARCHAR(100),
                quan_ly VARCHAR(100),
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
            );
        """,
        'employees': """
            CREATE TABLE IF NOT EXISTS employees (
                ma_nhan_vien VARCHAR(100) PRIMARY KEY,
                ho_ten VARCHAR(255),
                email VARCHAR(255),
                so_dien_thoai VARCHAR(50),
                ngay_vao_lam VARCHAR(100)
            );
        """,
        'org_allocations': """
            CREATE TABLE IF NOT EXISTS org_allocations (
                id SERIAL PRIMARY KEY,
                ma_du_an VARCHAR(100) REFERENCES projects(ma_du_an) ON DELETE CASCADE,
                ma_nhan_vien VARCHAR(100),
                ma_oc VARCHAR(100),
                name_oc TEXT,
                chuc_danh VARCHAR(255),
                tinh_trang VARCHAR(100),
                ghi_chu TEXT,
                vung VARCHAR(100),
                phan_loai_oc VARCHAR(100)
            );
        """,
        'project_departments': """
            CREATE TABLE IF NOT EXISTS project_departments (
                id SERIAL PRIMARY KEY,
                ma_du_an VARCHAR(100) REFERENCES projects(ma_du_an) ON DELETE CASCADE,
                ma_oc VARCHAR(100),
                name_oc TEXT,
                UNIQUE(ma_du_an, ma_oc)
            );
        """,
        'common_allocations': """
            CREATE TABLE IF NOT EXISTS common_allocations (
                id SERIAL PRIMARY KEY,
                ma_nhan_vien VARCHAR(100),
                ma_oc VARCHAR(100),
                name_oc TEXT,
                chuc_danh VARCHAR(255),
                tinh_trang VARCHAR(100),
                ghi_chu TEXT
            );
        """,
        'transfer_history': """
            CREATE TABLE IF NOT EXISTS transfer_history (
                id SERIAL PRIMARY KEY,
                ma_nhan_vien VARCHAR(100) REFERENCES employees(ma_nhan_vien) ON DELETE CASCADE,
                tu_du_an VARCHAR(100),
                den_du_an VARCHAR(100),
                tu_phong_ban VARCHAR(255),
                den_phong_ban VARCHAR(255),
                tu_chuc_danh VARCHAR(255),
                den_chuc_danh VARCHAR(255),
                ngay_luan_chuyen VARCHAR(100),
                ly_do TEXT,
                ghi_chu TEXT
            );
        """,
        'evaluations': """
            CREATE TABLE IF NOT EXISTS evaluations (
                id SERIAL PRIMARY KEY,
                ma_nhan_vien VARCHAR(100) REFERENCES employees(ma_nhan_vien) ON DELETE CASCADE,
                ngay_danh_gia VARCHAR(100),
                nguoi_danh_gia VARCHAR(255),
                diem_so INTEGER,
                nang_luc TEXT,
                uu_diem TEXT,
                nhuoc_diem TEXT,
                nhan_xet_chung TEXT
            );
        """
    }

    # 4. Create Tables
    print("Creating tables in PostgreSQL...")
    for table_name, sql in tables_sql.items():
        print(f" - Table {table_name}...")
        pg_cur.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
        pg_cur.execute(sql)
    pg_conn.commit()

    # 5. Migrate Data
    tables_to_migrate = [
        ('projects', [
            'ma_du_an', 'ten_du_an', 'khu_vuc', 'hien_trang_dau_tu',
            'nhom_du_an', 'quan_ly',
            'ten_phap_ly', 'ten_thuong_mai', 'chu_dau_tu', 'dia_diem_du_an',
            'tong_dien_tich_ha', 'so_luong_san_pham', 'nguon_goc_du_an',
            'source_stt', 'tong_cong_ty', 'tinh_cu', 'tinh_moi', 'loai_hinh',
            'muc_do_uu_tien',
            'updated_at', 'updated_by'
        ]),
        ('employees', ['ma_nhan_vien', 'ho_ten', 'email', 'so_dien_thoai', 'ngay_vao_lam']),
        ('org_allocations', ['id', 'ma_du_an', 'ma_nhan_vien', 'ma_oc', 'name_oc', 'chuc_danh', 'tinh_trang', 'ghi_chu', 'vung', 'phan_loai_oc']),
        ('project_departments', ['id', 'ma_du_an', 'ma_oc', 'name_oc']),
        ('common_allocations', ['id', 'ma_nhan_vien', 'ma_oc', 'name_oc', 'chuc_danh', 'tinh_trang', 'ghi_chu']),
        ('transfer_history', ['id', 'ma_nhan_vien', 'tu_du_an', 'den_du_an', 'tu_phong_ban', 'den_phong_ban', 'tu_chuc_danh', 'den_chuc_danh', 'ngay_luan_chuyen', 'ly_do', 'ghi_chu']),
        ('evaluations', ['id', 'ma_nhan_vien', 'ngay_danh_gia', 'nguoi_danh_gia', 'diem_so', 'nang_luc', 'uu_diem', 'nhuoc_diem', 'nhan_xet_chung'])
    ]

    print("\nMigrating data...")
    for table_name, columns in tables_to_migrate:
        # Fetch from SQLite
        print(f"Reading from SQLite: {table_name}...")
        sqlite_cur.execute(f"SELECT {', '.join(columns)} FROM {table_name}")
        rows = sqlite_cur.fetchall()
        
        if not rows:
            print(f" - No data in {table_name}.")
            continue
            
        print(f" - Found {len(rows)} records. Inserting into PostgreSQL...")
        
        # Prepare query
        col_list = ', '.join(columns)
        val_placeholders = ', '.join(['%s'] * len(columns))
        insert_query = f"INSERT INTO {table_name} ({col_list}) VALUES ({val_placeholders})"
        
        # In PostgreSQL, we want to override serial sequence values if id column is present
        # If it's a serial column, we should reset the sequence after insert
        data_to_insert = [tuple(row[col] for col in columns) for row in rows]
        
        # Execute batch insert
        pg_cur.executemany(insert_query, data_to_insert)
        pg_conn.commit()
        
        # Reset serial sequence for tables that have auto-incrementing ID
        if 'id' in columns:
            seq_query = f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name}"
            pg_cur.execute(seq_query)
            pg_conn.commit()
            
        print(f" - Successfully migrated {table_name}.")

    # Close connections
    sqlite_conn.close()
    pg_cur.close()
    pg_conn.close()
    print("\nMigration completed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate SQLite database to PostgreSQL.")
    parser.add_argument("--host", default="localhost", help="PostgreSQL host (default: localhost)")
    parser.add_argument("--port", default="5432", help="PostgreSQL port (default: 5432)")
    parser.add_argument("--user", default="postgres", help="PostgreSQL username (default: postgres)")
    parser.add_argument("--password", required=True, help="PostgreSQL password")
    parser.add_argument("--database", default="hr_management_system", help="Target PostgreSQL database name (default: hr_management_system)")
    
    args = parser.parse_args()
    migrate(args.host, args.port, args.user, args.password, args.database)
