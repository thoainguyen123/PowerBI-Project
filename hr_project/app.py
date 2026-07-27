import sqlite3
import csv
import json
import os
import re
import shutil
import sys
import unicodedata
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from flask import (
    Flask, g, has_app_context, jsonify, render_template, request, send_file, session
)
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import openpyxl
import psycopg2
import psycopg2.extras

# Console Windows mặc định là cp1252 nên mọi print tiếng Việt sẽ ném
# UnicodeEncodeError và làm sập app. Ép stdout/stderr về UTF-8 ngay từ đầu.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

# Load .env file manually if exists
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                val = val.strip()
                # Bỏ cặp nháy bao ngoài để SECRET_KEY="abc" không thành giá trị có nháy
                if len(val) >= 2 and val[0] == val[-1] and val[0] in ('"', "'"):
                    val = val[1:-1]
                os.environ.setdefault(key.strip(), val)


def env_flag(name, default=False):
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


def require_env(name, purpose):
    """Biến bắt buộc: thiếu thì dừng hẳn thay vì chạy tiếp bằng giá trị mặc định đoán được."""
    value = (os.environ.get(name) or '').strip()
    if not value:
        raise RuntimeError(
            f"Thiếu biến môi trường bắt buộc {name} ({purpose}). "
            "Tạo .env từ .env.example và điền giá trị thật trước khi chạy."
        )
    return value


USE_POSTGRES = env_flag('USE_POSTGRES', True)

app = Flask(__name__, static_folder='static', template_folder='templates')
# Không còn secret mặc định: nếu thiếu SECRET_KEY thì session sẽ được ký bằng khóa
# mà ai đọc mã nguồn cũng biết, đủ để giả mạo cookie admin.
app.secret_key = require_env('SECRET_KEY', 'khóa ký session')
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    # Bật khi chạy sau HTTPS để cookie không bị gửi qua kết nối thường
    SESSION_COOKIE_SECURE=env_flag('SESSION_COOKIE_SECURE', False),
    PERMANENT_SESSION_LIFETIME=timedelta(hours=int(os.environ.get('SESSION_HOURS', '12'))),
)

# Frontend gọi API cùng origin (API_URL = '/api') nên mặc định KHÔNG bật CORS.
# Chỉ bật khi thật sự có origin khác, và phải liệt kê tường minh trong CORS_ORIGINS.
CORS_ORIGINS = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]
if CORS_ORIGINS:
    CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

DB_PATH = os.environ.get('DB_PATH', 'hr_management.db')
EXCEL_PATH = os.environ.get('EXCEL_PATH', 'Data_structure_v1 (5).xlsx')
MASTERDATA_TEMPLATE_PATH = os.environ.get(
    'MASTERDATA_TEMPLATE_PATH',
    '../NVLG_PROJECT/Template_Nhap_Lieu_Master_Data_Du_An.xlsx'
)

# Read environment variables for PostgreSQL connection
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5433')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_NAME = os.environ.get('DB_NAME', 'hr_management_system')
DB_PASSWORD = (
    require_env('DB_PASSWORD', 'mật khẩu PostgreSQL')
    if USE_POSTGRES
    else os.environ.get('DB_PASSWORD', '')
)

# Regional Users Database
# Mật khẩu chỉ nằm trong bộ nhớ dưới dạng hash. Thứ tự ưu tiên cho từng tài khoản:
#   <USER>_PASSWORD_HASH  ->  <USER>_PASSWORD  ->  USER_PASSWORD (dùng chung, chỉ để tương thích cũ)
SHARED_USER_PASSWORD = (os.environ.get('USER_PASSWORD') or '').strip()

USER_PROFILES = {
    'admin': {
        'role': 'admin',
        'region_keyword': None,
        'display_name': 'Admin Hệ thống'
    },
    'manager_dongnai': {
        'role': 'manager',
        'region_keyword': 'Đồng Nai',
        'display_name': 'Quản lý Đồng Nai'
    },
    'manager_hcm': {
        'role': 'manager',
        'region_keyword': 'TP.HCM',
        'display_name': 'Quản lý TP.HCM'
    },
    'manager_phanthiet': {
        'role': 'manager',
        'region_keyword': 'Phan Thiết',
        'display_name': 'Quản lý Phan Thiết'
    }
}


def resolve_password_hash(username):
    """Trả về (hash, plaintext_nếu_có) cho một tài khoản."""
    prefix = username.upper()
    stored_hash = (os.environ.get(f'{prefix}_PASSWORD_HASH') or '').strip()
    if stored_hash:
        return stored_hash, None
    plain = (os.environ.get(f'{prefix}_PASSWORD') or '').strip() or SHARED_USER_PASSWORD
    if not plain:
        raise RuntimeError(
            f"Thiếu mật khẩu cho tài khoản '{username}'. Đặt {prefix}_PASSWORD_HASH, "
            f"{prefix}_PASSWORD, hoặc USER_PASSWORD trong .env."
        )
    return generate_password_hash(plain), plain


USERS = {}
_plain_passwords = {}
for _username, _profile in USER_PROFILES.items():
    _hash, _plain = resolve_password_hash(_username)
    USERS[_username] = dict(_profile, password_hash=_hash)
    if _plain:
        _plain_passwords[_username] = _plain

if len(_plain_passwords) > 1 and len(set(_plain_passwords.values())) == 1:
    print(
        "CẢNH BÁO: mọi tài khoản đang dùng chung một mật khẩu, nên biết mật khẩu "
        "manager là đăng nhập được admin. Đặt ADMIN_PASSWORD / MANAGER_*_PASSWORD "
        "riêng trong .env để phân quyền có ý nghĩa."
    )
del _plain_passwords

# Hash giả cho username không tồn tại, để thời gian phản hồi không tiết lộ tài khoản nào có thật
DUMMY_PASSWORD_HASH = generate_password_hash('__nonexistent_account__')

class PostgresCursorWrapper:
    def __init__(self, cursor):
        self.cursor = cursor

    def execute(self, query, params=None):
        if params is not None:
            # Escape literal '%' characters as '%%' because psycopg2 parses '%' as format specifiers
            query = query.replace('%', '%%')
            # Convert SQLite placeholders '?' to PostgreSQL '%s'
            query = query.replace('?', '%s')
            query_upper = query.upper()
            
            # Map SQLite specific syntax to PostgreSQL standard
            if "INSERT OR IGNORE INTO PROJECT_DEPARTMENTS" in query_upper:
                query = query.replace("INSERT OR IGNORE INTO project_departments", "INSERT INTO project_departments")
                query += " ON CONFLICT (ma_du_an, ma_oc) DO NOTHING"
            elif "INSERT OR REPLACE INTO PROJECT_DEPARTMENTS" in query_upper:
                query = query.replace("INSERT OR REPLACE INTO project_departments", "INSERT INTO project_departments")
                query += " ON CONFLICT (ma_du_an, ma_oc) DO UPDATE SET name_oc = EXCLUDED.name_oc"
                
            self.cursor.execute(query, params)
        else:
            query_upper = query.upper()
            if "INSERT OR IGNORE INTO PROJECT_DEPARTMENTS" in query_upper:
                query = query.replace("INSERT OR IGNORE INTO project_departments", "INSERT INTO project_departments")
                query += " ON CONFLICT (ma_du_an, ma_oc) DO NOTHING"
            elif "INSERT OR REPLACE INTO PROJECT_DEPARTMENTS" in query_upper:
                query = query.replace("INSERT OR REPLACE INTO project_departments", "INSERT INTO project_departments")
                query += " ON CONFLICT (ma_du_an, ma_oc) DO UPDATE SET name_oc = EXCLUDED.name_oc"
                
            self.cursor.execute(query)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    @property
    def lastrowid(self):
        self.cursor.execute("SELECT lastval()")
        return self.cursor.fetchone()[0]

    def close(self):
        self.cursor.close()

    def __iter__(self):
        return iter(self.cursor)

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self.conn = conn

    def cursor(self):
        return PostgresCursorWrapper(self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor))

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

def _track_connection(conn):
    """Ghi nhận connection để teardown đóng hộ nếu request ném lỗi giữa chừng.

    Phần lớn endpoint gọi conn.close() thủ công nhưng không có try/finally, nên chỉ
    cần một exception là connection bị bỏ rơi -> Postgres cạn slot. close() gọi hai
    lần là vô hại nên lưới an toàn này không ảnh hưởng luồng bình thường.
    """
    if has_app_context():
        open_conns = getattr(g, '_open_db_connections', None)
        if open_conns is None:
            open_conns = []
            g._open_db_connections = open_conns
        open_conns.append(conn)
    return conn


@app.teardown_appcontext
def close_leftover_db_connections(exc):
    for conn in getattr(g, '_open_db_connections', None) or []:
        try:
            conn.close()
        except Exception:
            pass


def get_db_connection():
    if USE_POSTGRES:
        # KHÔNG fallback âm thầm sang SQLite. Trước đây khi Postgres chưa sẵn sàng
        # (container db khởi động sau web), app vẫn chạy nhưng ghi dữ liệu vào SQLite
        # trong container - dữ liệu nằm sai chỗ và mất khi container được tạo lại.
        # Để lỗi nổi lên thì sự cố lộ ra ngay thay vì âm thầm phân mảnh dữ liệu.
        conn = psycopg2.connect(
            host=DB_HOST,
            port=int(DB_PORT),
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return _track_connection(PostgresConnectionWrapper(conn))

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return _track_connection(conn)

PROJECT_OVERVIEW_COLUMNS = {
    'ten_phap_ly': 'TEXT',
    'ten_thuong_mai': 'TEXT',
    'chu_dau_tu': 'TEXT',
    'dia_diem_du_an': 'TEXT',
    'tong_dien_tich_ha': 'TEXT',
    'so_luong_san_pham': 'TEXT',
    'nguon_goc_du_an': 'TEXT',
    'updated_at': 'TEXT',
    'updated_by': 'TEXT'
}

MASTERDATA_SHEETS = {
    'HRC': {
        'nhom': '9.1 HRC', 'sort': 1, 'phan_nhom': 'Nhân sự', 'hang_muc': 'Nhân sự',
        'headers': ['Mã dự án', 'Tổng nhân sự theo định biên', 'Đang làm việc', 'Sẽ tuyển dụng', 'Chi tiết', 'Ghi chú']
    },
    'HDV': {
        'nhom': '9.2 FAC', 'sort': 2, 'phan_nhom': 'HDV', 'hang_muc': 'Thông báo tín dụng',
        'headers': ['Mã dự án', 'Đã có thông báo tín dụng', 'Chưa có thông báo tín dụng', 'Dự kiến có thông báo tín dụng', 'Chi tiết', 'Ghi chú']
    },
    'FS': {
        'nhom': '9.2 FAC', 'sort': 2, 'phan_nhom': 'FS',
        'item': 'Phiên bản',
        'headers': ['Mã dự án', 'Phiên bản', 'Hiện trạng FS', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'SAC': {
        'nhom': '9.3 SAC', 'sort': 3, 'phan_nhom': 'Bán hàng', 'hang_muc': 'Bán hàng',
        'headers': ['Mã dự án', 'Đã bán (SL ký HĐMB/Tổng số)', 'Chưa bán', 'Dự kiến bán', 'Chi tiết', 'Ghi chú']
    },
    'MAC': {
        'nhom': '9.4 MAC', 'sort': 4, 'phan_nhom': 'Sale kit / Sự kiện', 'hang_muc': 'Sale kit / Sự kiện',
        'headers': ['Mã dự án', 'Sale kit', 'Sự kiện', 'Ngày tổ chức', 'Chi tiết', 'Ghi chú']
    },
    'PTC': {
        'nhom': '9.5 PTC', 'sort': 5, 'phan_nhom': 'Kế hoạch cung ứng đấu thầu',
        'item': 'Phiên bản',
        'headers': ['Mã dự án', 'Phiên bản', 'Hiện trạng KH CUĐT', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'QSB': {
        'nhom': '9.6 QSB', 'sort': 6, 'phan_nhom': 'Ngân sách',
        'item': 'Hạng mục',
        'headers': ['Mã dự án', 'Hạng mục', 'Hiện trạng ngân sách', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'SEC': {
        'nhom': '9.7 SEC', 'sort': 7, 'phan_nhom': 'An ninh', 'hang_muc': 'Phương án an ninh',
        'headers': ['Mã dự án', 'Đã có PA An ninh', 'Chưa có PA An ninh', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'IDD': {
        'nhom': '9.8 IDD', 'sort': 8, 'phan_nhom': 'Thiết kế nội bộ',
        'item': 'Mục',
        'headers': ['Mã dự án', 'Mục', 'Hiện trạng hồ sơ', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'CSC': {
        'nhom': '9.9 CSC', 'sort': 9, 'phan_nhom': 'Bồi thường, giải phóng mặt bằng', 'hang_muc': 'Bồi thường / GPMB',
        'headers': ['Mã dự án', 'Có thực hiện BT/GPMB', 'Không thực hiện BT/GPMB', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'PMD': {
        'nhom': '4.0 PMD', 'sort': 10, 'phan_nhom': 'Master Timeline',
        'item': 'Phiên bản',
        'headers': ['Mã dự án', 'Phiên bản', 'Hiện trạng MTL', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'PLP': {
        'nhom': '4.1 PLP', 'sort': 11, 'phan_nhom': 'Pháp lý',
        'item': 'Hạng mục', 'subgroup': 'Nhóm',
        'headers': ['Mã dự án', 'Nhóm', 'Hạng mục', 'Trạng thái', 'Văn bản phê duyệt', 'Khó khăn/Vướng mắc', 'Hướng xử lý', 'Ngày hoàn thành', 'Chi tiết']
    },
    'DMD': {
        'nhom': '4.2 DMD', 'sort': 12, 'phan_nhom': 'Thiết kế',
        'item': 'Hạng mục',
        'headers': ['Mã dự án', 'Hạng mục', 'Hiện trạng hồ sơ', 'Điều chỉnh (nếu có)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'PCD': {
        'nhom': '4.3 PCD', 'sort': 13, 'phan_nhom': 'Thi công',
        'item': 'Mục',
        'headers': ['Mã dự án', 'Mục', 'Hiện trạng thi công (%)', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    },
    'OM': {
        'nhom': '4.4 OM', 'sort': 14, 'phan_nhom': 'Bàn giao nhà', 'hang_muc': 'Bàn giao nhà',
        'headers': ['Mã dự án', 'Đã bàn giao ( Số lượng giao /Tổng số)', 'Chưa bàn giao', 'Ngày hoàn thành', 'Chi tiết', 'Ghi chú']
    }
}

PHONG_NHOM_MAP = {
    '9.1 HRC': '9.1 HRC - NHÂN SỰ',
    '9.2 FAC': '9.2 FAC',
    '9.3 SAC': '9.3 SAC - BÁN HÀNG',
    '9.4 MAC': '9.4 MAC - SALE KIT / SỰ KIỆN',
    '9.5 PTC': '9.5 PTC - KẾ HOẠCH CƯĐT',
    '9.6 QSB': '9.6 QSB - NGÂN SÁCH',
    '9.7 SEC': '9.7 SEC - AN NINH',
    '9.8 IDD': '9.8 IDD - THIẾT KẾ NỘI BỘ',
    '9.9 CSC': '9.9 CSC - BỒI THƯỜNG, GPMB',
    '4.0 PMD': '4.0 PMD', '4.1 PLP': '4.1 PLP',
    '4.2 DMD': '4.2 DMD', '4.3 PCD': '4.3 PCD', '4.4 OM': '4.4 OM'
}

FACT_MASTERDATA_COLUMNS = [
    'fact_id', 'project_code', 'nhom', 'Phong_Nhom', 'sort_colum',
    'phan_nhom', 'hang_muc', 'hien_trang', 'dieu_chinh',
    'ngay_hoan_thanh', 'chi_tiet', 'ghi_chu', 'van_ban_phe_duyet',
    'kho_khan_vuong_mac', 'huong_xu_ly', 'gia_tri_1', 'gia_tri_2',
    'gia_tri_3', 'source_sheet', 'source_row', 'raw_data'
]

def clean_master_value(value):
    if value is None:
        return ''
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', str(value)).strip())

def normalize_master_values(values, sheet_name):
    allowed_headers = MASTERDATA_SHEETS[sheet_name]['headers']
    return {
        header: clean_master_value(values.get(header))
        for header in allowed_headers
    }

def master_record_value(values, header):
    return clean_master_value(values.get(header))

def master_first_value(values, *headers):
    for header in headers:
        value = master_record_value(values, header)
        if value:
            return value
    return ''

def build_fact_masterdata_row(entry):
    """Chuẩn hóa một bản ghi nhập liệu theo đúng build_fact_masterdata.py."""
    sheet_name = entry['source_sheet']
    config = MASTERDATA_SHEETS[sheet_name]
    values = json.loads(entry['data_json'])
    project_code = master_first_value(values, 'Mã dự án') or entry['project_code']
    nhom = config['nhom']
    phan_nhom = config.get('phan_nhom', '')

    if config.get('subgroup'):
        subgroup = master_record_value(values, config['subgroup'])
        if subgroup:
            phan_nhom = f'{phan_nhom} - {subgroup}'

    hang_muc = config.get('hang_muc', '')
    if config.get('item'):
        hang_muc = master_record_value(values, config['item'])

    hien_trang = master_first_value(
        values, 'Trạng thái', 'Hiện trạng FS', 'Hiện trạng KH CUĐT',
        'Hiện trạng ngân sách', 'Hiện trạng hồ sơ', 'Hiện trạng MTL',
        'Hiện trạng thi công (%)'
    )
    dieu_chinh = master_first_value(values, 'Điều chỉnh (nếu có)', 'Điều chỉnh')
    ngay_hoan_thanh = master_first_value(
        values, 'Ngày hoàn thành', 'Ngày tổ chức', 'Dự kiến bán',
        'Dự kiến có thông báo tín dụng'
    )

    gia_tri_1 = ''
    gia_tri_2 = ''
    gia_tri_3 = ''
    if sheet_name == 'HRC':
        gia_tri_1 = master_first_value(values, 'Tổng nhân sự theo định biên')
        gia_tri_2 = master_record_value(values, 'Đang làm việc')
        gia_tri_3 = master_record_value(values, 'Sẽ tuyển dụng')
    elif sheet_name == 'SAC':
        gia_tri_1 = master_record_value(values, 'Đã bán (SL ký HĐMB/Tổng số)')
        gia_tri_2 = master_record_value(values, 'Chưa bán')
    elif sheet_name == 'PCD':
        gia_tri_1 = master_record_value(values, 'Hiện trạng thi công (%)')
    elif sheet_name == 'HDV':
        gia_tri_1 = master_record_value(values, 'Đã có thông báo tín dụng')
        gia_tri_2 = master_record_value(values, 'Chưa có thông báo tín dụng')
    elif sheet_name == 'SEC':
        gia_tri_1 = master_record_value(values, 'Đã có PA An ninh')
        gia_tri_2 = master_record_value(values, 'Chưa có PA An ninh')
    elif sheet_name == 'CSC':
        gia_tri_1 = master_record_value(values, 'Có thực hiện BT/GPMB')
        gia_tri_2 = master_record_value(values, 'Không thực hiện BT/GPMB')
    elif sheet_name == 'OM':
        gia_tri_1 = master_record_value(values, 'Đã bàn giao ( Số lượng giao /Tổng số)')
        gia_tri_2 = master_record_value(values, 'Chưa bàn giao')
    elif sheet_name == 'MAC':
        gia_tri_1 = master_record_value(values, 'Sale kit')
        gia_tri_2 = master_record_value(values, 'Sự kiện')

    raw_data = {
        key: clean_master_value(value)
        for key, value in values.items()
        if clean_master_value(value)
    }
    return {
        'fact_id': f"{project_code}|{sheet_name}|{entry['source_row']}",
        'project_code': project_code,
        'nhom': nhom,
        'Phong_Nhom': PHONG_NHOM_MAP[nhom],
        'sort_colum': str(config['sort']),
        'phan_nhom': phan_nhom,
        'hang_muc': hang_muc,
        'hien_trang': hien_trang,
        'dieu_chinh': dieu_chinh,
        'ngay_hoan_thanh': ngay_hoan_thanh,
        'chi_tiet': master_record_value(values, 'Chi tiết'),
        'ghi_chu': master_record_value(values, 'Ghi chú'),
        'van_ban_phe_duyet': master_record_value(values, 'Văn bản phê duyệt'),
        'kho_khan_vuong_mac': master_record_value(values, 'Khó khăn/Vướng mắc'),
        'huong_xu_ly': master_record_value(values, 'Hướng xử lý'),
        'gia_tri_1': gia_tri_1,
        'gia_tri_2': gia_tri_2,
        'gia_tri_3': gia_tri_3,
        'source_sheet': sheet_name,
        'source_row': str(entry['source_row']),
        'raw_data': json.dumps(raw_data, ensure_ascii=False)
    }

def ensure_project_overview_schema():
    """Nâng cấp an toàn bảng projects trên cả SQLite và PostgreSQL."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if isinstance(conn, PostgresConnectionWrapper):
            for column_name, column_type in PROJECT_OVERVIEW_COLUMNS.items():
                cursor.execute(
                    f'ALTER TABLE projects ADD COLUMN IF NOT EXISTS '
                    f'{column_name} {column_type}'
                )
        else:
            cursor.execute('PRAGMA table_info(projects)')
            existing_columns = {row['name'] for row in cursor.fetchall()}
            for column_name, column_type in PROJECT_OVERVIEW_COLUMNS.items():
                if column_name not in existing_columns:
                    cursor.execute(
                        f'ALTER TABLE projects ADD COLUMN {column_name} {column_type}'
                    )
        conn.commit()
    except Exception as ex:
        conn.rollback()
        print(f"Không thể nâng cấp schema thông tin dự án: {ex}")
    finally:
        conn.close()

ensure_project_overview_schema()

def ensure_masterdata_schema():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if isinstance(conn, PostgresConnectionWrapper):
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS masterdata_entries (
                    id SERIAL PRIMARY KEY,
                    project_code TEXT NOT NULL,
                    source_sheet TEXT NOT NULL,
                    source_row INTEGER NOT NULL,
                    data_json TEXT NOT NULL,
                    updated_at TEXT,
                    updated_by TEXT,
                    UNIQUE(project_code, source_sheet, source_row)
                )
            ''')
        else:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS masterdata_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_code TEXT NOT NULL,
                    source_sheet TEXT NOT NULL,
                    source_row INTEGER NOT NULL,
                    data_json TEXT NOT NULL,
                    updated_at TEXT,
                    updated_by TEXT,
                    UNIQUE(project_code, source_sheet, source_row)
                )
            ''')
        conn.commit()

        # Gunicorn khởi động nhiều worker đồng thời. Khóa bảng để một worker
        # seed workbook trước; các worker còn lại sẽ kiểm tra COUNT sau đó.
        if isinstance(conn, PostgresConnectionWrapper):
            cursor.execute('LOCK TABLE masterdata_entries IN EXCLUSIVE MODE')
        cursor.execute('SELECT COUNT(*) AS total FROM masterdata_entries')
        if cursor.fetchone()['total'] == 0 and os.path.exists(MASTERDATA_TEMPLATE_PATH):
            workbook = openpyxl.load_workbook(
                MASTERDATA_TEMPLATE_PATH, read_only=True, data_only=True
            )
            for sheet_name in MASTERDATA_SHEETS:
                if sheet_name not in workbook.sheetnames:
                    continue
                worksheet = workbook[sheet_name]
                rows = worksheet.iter_rows(values_only=True)
                headers = [clean_master_value(value) for value in next(rows)]
                for source_row, row_values in enumerate(rows, start=2):
                    raw_values = dict(zip(headers, row_values))
                    project_code = clean_master_value(raw_values.get('Mã dự án'))
                    if not project_code:
                        continue
                    values = normalize_master_values(raw_values, sheet_name)
                    params = (
                        project_code, sheet_name, source_row,
                        json.dumps(values, ensure_ascii=False),
                        datetime.now().isoformat(timespec='seconds'), 'template-import'
                    )
                    if isinstance(conn, PostgresConnectionWrapper):
                        cursor.execute('''
                            INSERT INTO masterdata_entries (
                                project_code, source_sheet, source_row,
                                data_json, updated_at, updated_by
                            ) VALUES (?, ?, ?, ?, ?, ?)
                            ON CONFLICT (project_code, source_sheet, source_row) DO NOTHING
                        ''', params)
                    else:
                        cursor.execute('''
                            INSERT OR IGNORE INTO masterdata_entries (
                                project_code, source_sheet, source_row,
                                data_json, updated_at, updated_by
                            ) VALUES (?, ?, ?, ?, ?, ?)
                        ''', params)
        conn.commit()
    except Exception as ex:
        conn.rollback()
        print(f"Không thể khởi tạo master data: {ex}")
    finally:
        conn.close()

ensure_masterdata_schema()

def get_current_user():
    username = session.get('username')
    if username and username in USERS:
        return USERS[username]
    return None

def check_project_region(ma_du_an, user):
    if user['role'] == 'admin':
        return True
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT khu_vuc FROM projects WHERE ma_du_an = ?', (ma_du_an,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    khu_vuc = row['khu_vuc'] or ''
    return user['region_keyword'] in khu_vuc

def check_allocation_region(alloc_id, user):
    if user['role'] == 'admin':
        return True
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.vung, p.khu_vuc FROM org_allocations a
        LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
        WHERE a.id = ?
    ''', (alloc_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    vung = row['vung'] or ''
    khu_vuc = row['khu_vuc'] or ''
    return user['region_keyword'] in vung or user['region_keyword'] in khu_vuc

def check_dept_region(dept_id, user):
    if user['role'] == 'admin':
        return True
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.khu_vuc FROM project_departments pd
        JOIN projects p ON pd.ma_du_an = p.ma_du_an
        WHERE pd.id = ?
    ''', (dept_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return False
    khu_vuc = row['khu_vuc'] or ''
    return user['region_keyword'] in khu_vuc

@app.before_request
def before_request():
    if request.path == '/' or request.path.startswith('/static/'):
        return
    if request.path in ['/api/login', '/api/logout', '/api/me']:
        return
    if request.path.startswith('/api/'):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Unauthorized', 'logged_in': False}), 401

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', '')).strip()
    
    user_record = USERS.get(username)
    # Luôn chạy check_password_hash (kể cả khi username sai) để thời gian phản hồi
    # không tiết lộ tài khoản nào tồn tại.
    expected_hash = user_record['password_hash'] if user_record else DUMMY_PASSWORD_HASH
    if check_password_hash(expected_hash, password) and user_record:
        session['username'] = username
        session.permanent = True
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'display_name': USERS[username]['display_name'],
                'role': USERS[username]['role'],
                'region_keyword': USERS[username]['region_keyword']
            }
        })
    return jsonify({'error': 'Tên đăng nhập hoặc mật khẩu không chính xác!'}), 400

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'success': True})

@app.route('/api/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'logged_in': False})
    return jsonify({
        'logged_in': True,
        'username': session.get('username'),
        'display_name': user['display_name'],
        'role': user['role'],
        'region_keyword': user['region_keyword']
    })

# Helper to check if employee ID is planning placeholder
def is_placeholder_id(val):
    if val is None:
        return True
    val_str = str(val).strip().lower()
    if not val_str:
        return True
    return val_str in ['tuyển0', 'tuyển1', 'tuyển', 'không tuyển', 'không tồn tại', 'chưa tuyển', 'tuyến1', 'nan', 'null']

def clean_department_name(name):
    if not name:
        return name
    name_clean = str(name).strip()
    name_upper = name_clean.upper()
    if "BAN ĐIỀU HÀNH DỰ ÁN KHU VỰC" in name_upper:
        return "BAN ĐIỀU HÀNH DỰ ÁN KHU VỰC"
    return name_clean

def classify_oc(ma_oc):
    if not ma_oc:
        return 'PHONG_BAN_KHAC'
    ma_oc_clean = str(ma_oc).strip().upper()
    core_prefixes = ('GMD', 'PMD', 'PLP', 'DMD', 'PCD', 'PM')
    for pref in core_prefixes:
        if ma_oc_clean == pref or ma_oc_clean.startswith(pref) or ('.' + pref) in ma_oc_clean or (pref + '.') in ma_oc_clean:
            return 'BAN_DIEU_HANH_CHINH'
    return 'PHONG_BAN_KHAC'

# HTML Routes
@app.route('/')
def index():
    return render_template('index.html')

# API: Dashboard Stats
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    is_admin = (user['role'] == 'admin')
    keyword = user['region_keyword']
    
    # Total headcount (distinct real employee IDs currently allocated in project or common)
    if is_admin:
        cursor.execute('''
            SELECT COUNT(DISTINCT ma_nhan_vien) FROM (
                SELECT ma_nhan_vien FROM org_allocations 
                WHERE ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')
                  AND ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
                UNION
                SELECT ma_nhan_vien FROM common_allocations
                WHERE ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')
                  AND ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
            )
        ''')
    else:
        cursor.execute('''
            SELECT COUNT(DISTINCT a.ma_nhan_vien) 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')
              AND a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
        ''', (f"%{keyword}%", f"%{keyword}%"))
    total_headcount = cursor.fetchone()[0]
    
    # Total projects
    if is_admin:
        cursor.execute('SELECT COUNT(*) FROM projects')
    else:
        cursor.execute('SELECT COUNT(*) FROM projects WHERE khu_vuc LIKE ?', (f"%{keyword}%",))
    total_projects = cursor.fetchone()[0]
    
    # Total open positions (only count Tuyển1 and Tuyển as they carry headcount)
    if is_admin:
        cursor.execute('''
            SELECT COUNT(*) FROM org_allocations 
            WHERE ma_nhan_vien IN ('Tuyển1', 'Tuyển')
        ''')
    else:
        cursor.execute('''
            SELECT COUNT(*) FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IN ('Tuyển1', 'Tuyển')
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
        ''', (f"%{keyword}%", f"%{keyword}%"))
    total_open_positions = cursor.fetchone()[0]
    
    # Concurrent positions (tinh_trang containing 'KN')
    if is_admin:
        cursor.execute('''
            SELECT COUNT(*) FROM org_allocations 
            WHERE (tinh_trang LIKE '%KN%' OR tinh_trang LIKE '%kiêm nhiệm%')
              AND ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')
              AND ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
        ''')
    else:
        cursor.execute('''
            SELECT COUNT(*) FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE (a.tinh_trang LIKE '%KN%' OR a.tinh_trang LIKE '%kiêm nhiệm%')
              AND a.ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')
              AND a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
        ''', (f"%{keyword}%", f"%{keyword}%"))
    total_concurrent = cursor.fetchone()[0]
    
    # Define headcount formula
    hc_formula = '''
        CASE 
            WHEN ma_nhan_vien IN ('Tuyển1', 'Tuyển') THEN 1
            WHEN ma_nhan_vien IN ('Tuyển0', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1') THEN 0
            WHEN tinh_trang LIKE '%KN%' OR tinh_trang LIKE '%kiêm nhiệm%' THEN 0
            ELSE 1
        END
    '''
    hc_formula_alias = '''
        CASE 
            WHEN a.ma_nhan_vien IN ('Tuyển1', 'Tuyển') THEN 1
            WHEN a.ma_nhan_vien IN ('Tuyển0', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1') THEN 0
            WHEN a.tinh_trang LIKE '%KN%' OR a.tinh_trang LIKE '%kiêm nhiệm%' THEN 0
            ELSE 1
        END
    '''
    
    # Headcount by Classification (Ban điều hành chính vs Phòng ban khác)
    if is_admin:
        cursor.execute(f'''
            SELECT phan_loai_oc, SUM({hc_formula}) as cnt 
            FROM org_allocations 
            WHERE ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
            GROUP BY phan_loai_oc
        ''')
    else:
        cursor.execute(f'''
            SELECT a.phan_loai_oc, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY a.phan_loai_oc
        ''', (f"%{keyword}%", f"%{keyword}%"))
    headcount_by_classification = {'BAN_DIEU_HANH_CHINH': 0, 'PHONG_BAN_KHAC': 0}
    for row in cursor.fetchall():
        lbl = row['phan_loai_oc'] if row['phan_loai_oc'] else 'PHONG_BAN_KHAC'
        headcount_by_classification[lbl] = row['cnt'] or 0
        
    # Headcount by Region
    if is_admin:
        cursor.execute(f'''
            SELECT COALESCE(vung, 'Chưa xác định') as rgn, SUM({hc_formula}) as cnt 
            FROM org_allocations 
            WHERE ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
            GROUP BY COALESCE(vung, 'Chưa xác định') ORDER BY cnt DESC
        ''')
    else:
        cursor.execute(f'''
            SELECT COALESCE(a.vung, 'Chưa xác định') as rgn, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY COALESCE(a.vung, 'Chưa xác định') ORDER BY cnt DESC
        ''', (f"%{keyword}%", f"%{keyword}%"))
    headcount_by_region = {row['rgn']: row['cnt'] or 0 for row in cursor.fetchall()}
    
    # Headcount by Department (Name OC)
    if is_admin:
        cursor.execute(f'''
            SELECT COALESCE(name_oc, 'Chưa xác định') as dept, SUM({hc_formula}) as cnt 
            FROM org_allocations 
            WHERE ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
            GROUP BY name_oc ORDER BY cnt DESC LIMIT 15
        ''')
    else:
        cursor.execute(f'''
            SELECT COALESCE(a.name_oc, 'Chưa xác định') as dept, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY a.name_oc ORDER BY cnt DESC LIMIT 15
        ''', (f"%{keyword}%", f"%{keyword}%"))
    headcount_by_department = {row['dept']: row['cnt'] or 0 for row in cursor.fetchall()}
    
    # Headcount by Project (top 15)
    if is_admin:
        cursor.execute(f'''
            SELECT a.ma_du_an, COALESCE(p.ten_du_an, a.ma_du_an) as proj_name, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
            GROUP BY a.ma_du_an, p.ten_du_an ORDER BY cnt DESC LIMIT 15
        ''')
    else:
        cursor.execute(f'''
            SELECT a.ma_du_an, COALESCE(p.ten_du_an, a.ma_du_an) as proj_name, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY a.ma_du_an, p.ten_du_an ORDER BY cnt DESC LIMIT 15
        ''', (f"%{keyword}%", f"%{keyword}%"))
    headcount_by_project = {row['proj_name']: row['cnt'] or 0 for row in cursor.fetchall()}
    
    # Headcount by Title (top 15)
    if is_admin:
        cursor.execute(f'''
            SELECT COALESCE(chuc_danh, 'Chưa xác định') as title, SUM({hc_formula}) as cnt 
            FROM org_allocations 
            WHERE ma_nhan_vien IS NOT NULL AND ma_nhan_vien != ''
            GROUP BY chuc_danh ORDER BY cnt DESC LIMIT 15
        ''')
    else:
        cursor.execute(f'''
            SELECT COALESCE(a.chuc_danh, 'Chưa xác định') as title, SUM({hc_formula_alias}) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IS NOT NULL AND a.ma_nhan_vien != ''
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY a.chuc_danh ORDER BY cnt DESC LIMIT 15
        ''', (f"%{keyword}%", f"%{keyword}%"))
    headcount_by_title = {row['title']: row['cnt'] or 0 for row in cursor.fetchall()}
    
    # Open positions by Title (top 15)
    if is_admin:
        cursor.execute('''
            SELECT COALESCE(chuc_danh, 'Chưa xác định') as title, COUNT(*) as cnt 
            FROM org_allocations 
            WHERE ma_nhan_vien IN ('Tuyển1', 'Tuyển')
            GROUP BY chuc_danh ORDER BY cnt DESC LIMIT 15
        ''')
    else:
        cursor.execute('''
            SELECT COALESCE(a.chuc_danh, 'Chưa xác định') as title, COUNT(*) as cnt 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien IN ('Tuyển1', 'Tuyển')
              AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)
            GROUP BY a.chuc_danh ORDER BY cnt DESC LIMIT 15
        ''', (f"%{keyword}%", f"%{keyword}%"))
    open_by_title = {row['title']: row['cnt'] or 0 for row in cursor.fetchall()}
    
    conn.close()
    
    return jsonify({
        'total_headcount': total_headcount,
        'total_projects': total_projects,
        'total_open_positions': total_open_positions,
        'total_concurrent': total_concurrent,
        'headcount_by_classification': headcount_by_classification,
        'headcount_by_region': headcount_by_region,
        'headcount_by_department': headcount_by_department,
        'headcount_by_project': headcount_by_project,
        'headcount_by_title': headcount_by_title,
        'open_by_title': open_by_title
    })

# API: Employees CRUD
@app.route('/api/employees', methods=['GET', 'POST'])
def manage_employees():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM employees ORDER BY ho_ten ASC')
        employees = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(employees)
        
    elif request.method == 'POST':
        data = request.json
        ma_nv = str(data.get('ma_nhan_vien', '')).strip()
        ho_ten = str(data.get('ho_ten', '')).strip()
        email = str(data.get('email', '')).strip()
        so_dien_thoai = str(data.get('so_dien_thoai', '')).strip()
        ngay_vao_lam = str(data.get('ngay_vao_lam', '')).strip()
        
        if not ma_nv or not ho_ten:
            return jsonify({'error': 'Mã nhân viên và Họ tên là bắt buộc!'}), 400
            
        if is_placeholder_id(ma_nv):
            return jsonify({'error': 'Mã nhân viên không được trùng với các từ khóa tuyển dụng!'}), 400
            
        try:
            cursor.execute('INSERT INTO employees VALUES (?, ?, ?, ?, ?)', 
                           (ma_nv, ho_ten, email, so_dien_thoai, ngay_vao_lam))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'ma_nhan_vien': ma_nv})
        except (sqlite3.IntegrityError, psycopg2.IntegrityError):
            conn.close()
            return jsonify({'error': 'Mã nhân viên đã tồn tại!'}), 400

@app.route('/api/employees/<ma_nhan_vien>', methods=['GET', 'PUT', 'DELETE'])
def manage_single_employee(ma_nhan_vien):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM employees WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
    employee = cursor.fetchone()
    if not employee:
        conn.close()
        return jsonify({'error': 'Không tìm thấy nhân sự!'}), 404
        
    if request.method == 'GET':
        emp_dict = dict(employee)
        # Get allocations for this employee (project allocations)
        cursor.execute('''
            SELECT a.*, p.ten_du_an FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            WHERE a.ma_nhan_vien = ?
        ''', (ma_nhan_vien,))
        emp_dict['allocations'] = [dict(row) for row in cursor.fetchall()]
        
        # Get common allocations (shared/system roles)
        cursor.execute('''
            SELECT * FROM common_allocations WHERE ma_nhan_vien = ?
        ''', (ma_nhan_vien,))
        emp_dict['common_allocations'] = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(emp_dict)
        
    elif request.method == 'PUT':
        data = request.json
        ho_ten = str(data.get('ho_ten', employee['ho_ten'])).strip()
        email = str(data.get('email', employee['email'])).strip()
        so_dien_thoai = str(data.get('so_dien_thoai', employee['so_dien_thoai'])).strip()
        ngay_vao_lam = str(data.get('ngay_vao_lam', employee['ngay_vao_lam'])).strip()
        
        cursor.execute('''
            UPDATE employees SET ho_ten = ?, email = ?, so_dien_thoai = ?, ngay_vao_lam = ?
            WHERE ma_nhan_vien = ?
        ''', (ho_ten, email, so_dien_thoai, ngay_vao_lam, ma_nhan_vien))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
        
    elif request.method == 'DELETE':
        cursor.execute('DELETE FROM employees WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
        cursor.execute('DELETE FROM org_allocations WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
        cursor.execute('DELETE FROM common_allocations WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
        cursor.execute('DELETE FROM evaluations WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
        cursor.execute('DELETE FROM transfer_history WHERE ma_nhan_vien = ?', (ma_nhan_vien,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

# API: Projects
@app.route('/api/projects', methods=['GET', 'POST'])
def manage_projects():
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        if user['role'] == 'admin':
            cursor.execute('SELECT * FROM projects ORDER BY ma_du_an ASC')
        else:
            cursor.execute('SELECT * FROM projects WHERE khu_vuc LIKE ? ORDER BY ma_du_an ASC', (f"%{user['region_keyword']}%",))
        projs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(projs)
        
    elif request.method == 'POST':
        data = request.json or {}
        ma_da = str(data.get('ma_du_an', '')).strip()
        ten_da = str(data.get('ten_du_an', '')).strip()
        khu_vuc = str(data.get('khu_vuc', '')).strip()
        trang_thai = str(data.get('trang_thai', 'Đang nghiên cứu')).strip()
        nhom = str(data.get('nhom', '')).strip()
        quan_ly = str(data.get('quan_ly', '')).strip()
        ten_phap_ly = str(data.get('ten_phap_ly', '')).strip()
        ten_thuong_mai = str(data.get('ten_thuong_mai', '')).strip()
        chu_dau_tu = str(data.get('chu_dau_tu', '')).strip()
        dia_diem = str(data.get('dia_diem_du_an', '')).strip()
        dien_tich = str(data.get('tong_dien_tich_ha', '')).strip()
        so_san_pham = str(data.get('so_luong_san_pham', '')).strip()
        nguon_goc = str(data.get('nguon_goc_du_an', '')).strip()
        updated_at = datetime.now().isoformat(timespec='seconds')
        updated_by = session.get('username', '')
        
        if not ma_da or not ten_da:
            return jsonify({'error': 'Mã dự án và Tên dự án là bắt buộc!'}), 400
            
        if user['role'] != 'admin' and user['region_keyword'] not in khu_vuc:
            return jsonify({'error': 'Bạn không có quyền tạo dự án ở vùng khác!'}), 403
            
        try:
            cursor.execute('''
                INSERT INTO projects (
                    ma_du_an, ten_du_an, khu_vuc, trang_thai, nhom, quan_ly,
                    ten_phap_ly, ten_thuong_mai, chu_dau_tu, dia_diem_du_an,
                    tong_dien_tich_ha, so_luong_san_pham, nguon_goc_du_an,
                    updated_at, updated_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                ma_da, ten_da, khu_vuc, trang_thai, nhom, quan_ly,
                ten_phap_ly, ten_thuong_mai, chu_dau_tu, dia_diem,
                dien_tich, so_san_pham, nguon_goc, updated_at, updated_by
            ))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'ma_du_an': ma_da})
        except (sqlite3.IntegrityError, psycopg2.IntegrityError):
            conn.close()
            return jsonify({'error': 'Mã dự án đã tồn tại!'}), 400

@app.route('/api/projects/overview-stats', methods=['GET'])
def get_project_overview_stats():
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    if user['role'] == 'admin':
        cursor.execute('SELECT * FROM projects')
    else:
        cursor.execute(
            'SELECT * FROM projects WHERE khu_vuc LIKE ?',
            (f"%{user['region_keyword']}%",)
        )
    projects = [dict(row) for row in cursor.fetchall()]
    conn.close()

    overview_fields = [
        'ten_phap_ly', 'ten_thuong_mai', 'chu_dau_tu', 'dia_diem_du_an',
        'tong_dien_tich_ha', 'so_luong_san_pham', 'nguon_goc_du_an'
    ]
    complete = sum(
        1 for project in projects
        if all(str(project.get(field) or '').strip() for field in overview_fields)
    )
    active_statuses = {'Đã mua, đang thiết kế', 'Đang xây dựng', 'Đang vận hành'}
    active = sum(1 for project in projects if project.get('trang_thai') in active_statuses)
    regions = len({
        str(project.get('khu_vuc') or '').strip()
        for project in projects if str(project.get('khu_vuc') or '').strip()
    })
    return jsonify({
        'total': len(projects),
        'complete': complete,
        'incomplete': len(projects) - complete,
        'active': active,
        'regions': regions
    })

@app.route('/api/projects/export-overview', methods=['GET'])
def export_project_overview():
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    if user['role'] == 'admin':
        cursor.execute('SELECT * FROM projects ORDER BY ma_du_an ASC')
    else:
        cursor.execute(
            'SELECT * FROM projects WHERE khu_vuc LIKE ? ORDER BY ma_du_an ASC',
            (f"%{user['region_keyword']}%",)
        )
    projects = [dict(row) for row in cursor.fetchall()]
    conn.close()

    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = 'Tổng quan dự án'
    headers = [
        'Mã dự án', 'Tên pháp lý dự án', 'Tên thương mại', 'Chủ đầu tư',
        'Địa điểm dự án', 'Tổng diện tích (ha)', 'Số lượng sản phẩm',
        'Nguồn gốc dự án'
    ]
    worksheet.append(headers)
    for project in projects:
        worksheet.append([
            project.get('ma_du_an'),
            project.get('ten_phap_ly') or project.get('ten_du_an'),
            project.get('ten_thuong_mai'),
            project.get('chu_dau_tu'),
            project.get('dia_diem_du_an'),
            project.get('tong_dien_tich_ha'),
            project.get('so_luong_san_pham'),
            project.get('nguon_goc_du_an')
        ])
    worksheet.freeze_panes = 'A2'
    worksheet.auto_filter.ref = worksheet.dimensions
    widths = [18, 34, 28, 30, 40, 22, 22, 28]
    for index, width in enumerate(widths, start=1):
        worksheet.column_dimensions[openpyxl.utils.get_column_letter(index)].width = width

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return send_file(
        output,
        as_attachment=True,
        download_name='Template_Nhap_Lieu_Master_Data_Du_An.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@app.route('/api/projects/<ma_du_an>', methods=['GET', 'PUT'])
def manage_single_project(ma_du_an):
    user = get_current_user()
    if not check_project_region(ma_du_an, user):
        return jsonify({'error': 'Bạn không có quyền truy cập dự án ở vùng khác!'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM projects WHERE ma_du_an = ?', (ma_du_an,))
    project = cursor.fetchone()
    if not project:
        conn.close()
        return jsonify({'error': 'Không tìm thấy dự án!'}), 404

    if request.method == 'GET':
        result = dict(project)
        conn.close()
        return jsonify(result)

    data = request.json or {}
    current = dict(project)
    fields = [
        'ten_du_an', 'khu_vuc', 'trang_thai', 'nhom', 'quan_ly',
        'ten_phap_ly', 'ten_thuong_mai', 'chu_dau_tu', 'dia_diem_du_an',
        'tong_dien_tich_ha', 'so_luong_san_pham', 'nguon_goc_du_an'
    ]
    values = {
        field: str(data.get(field, current.get(field) or '')).strip()
        for field in fields
    }
    if not values['ten_du_an']:
        conn.close()
        return jsonify({'error': 'Tên dự án là bắt buộc!'}), 400
    if user['role'] != 'admin' and user['region_keyword'] not in values['khu_vuc']:
        conn.close()
        return jsonify({'error': 'Bạn không có quyền chuyển dự án sang vùng khác!'}), 403

    cursor.execute('''
        UPDATE projects SET
            ten_du_an = ?, khu_vuc = ?, trang_thai = ?, nhom = ?, quan_ly = ?,
            ten_phap_ly = ?, ten_thuong_mai = ?, chu_dau_tu = ?,
            dia_diem_du_an = ?, tong_dien_tich_ha = ?, so_luong_san_pham = ?,
            nguon_goc_du_an = ?, updated_at = ?, updated_by = ?
        WHERE ma_du_an = ?
    ''', (
        values['ten_du_an'], values['khu_vuc'], values['trang_thai'],
        values['nhom'], values['quan_ly'], values['ten_phap_ly'],
        values['ten_thuong_mai'], values['chu_dau_tu'],
        values['dia_diem_du_an'], values['tong_dien_tich_ha'],
        values['so_luong_san_pham'], values['nguon_goc_du_an'],
        datetime.now().isoformat(timespec='seconds'), session.get('username', ''),
        ma_du_an
    ))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'ma_du_an': ma_du_an})

# API: Master Data phòng ban dùng cho Fact_MasterData
@app.route('/api/masterdata/config', methods=['GET'])
def get_masterdata_config():
    sheets = []
    for sheet_name, config in sorted(
        MASTERDATA_SHEETS.items(), key=lambda item: (item[1]['sort'], item[0])
    ):
        sheets.append({
            'sheet': sheet_name,
            'nhom': config['nhom'],
            'sort_colum': config['sort'],
            'phan_nhom': config['phan_nhom'],
            'headers': config['headers']
        })
    return jsonify(sheets)

@app.route('/api/masterdata/entries', methods=['GET', 'POST'])
def manage_masterdata_entries():
    user = get_current_user()
    if request.method == 'GET':
        project_code = clean_master_value(request.args.get('project_code'))
        sheet_name = clean_master_value(request.args.get('sheet'))
        if not project_code:
            return jsonify({'error': 'Vui lòng chọn dự án!'}), 400
        if sheet_name and sheet_name not in MASTERDATA_SHEETS:
            return jsonify({'error': 'Sheet master data không hợp lệ!'}), 400
        if not check_project_region(project_code, user):
            return jsonify({'error': 'Bạn không có quyền truy cập dự án ở vùng khác!'}), 403

        conn = get_db_connection()
        cursor = conn.cursor()
        if sheet_name:
            cursor.execute('''
                SELECT * FROM masterdata_entries
                WHERE project_code = ? AND source_sheet = ?
                ORDER BY source_row ASC
            ''', (project_code, sheet_name))
        else:
            cursor.execute('''
                SELECT * FROM masterdata_entries
                WHERE project_code = ?
                ORDER BY source_sheet ASC, source_row ASC
            ''', (project_code,))
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        rows.sort(key=lambda row: (
            MASTERDATA_SHEETS.get(row['source_sheet'], {}).get('sort', 999),
            row['source_sheet'], row['source_row']
        ))
        return jsonify([{
            'id': row['id'],
            'project_code': row['project_code'],
            'source_sheet': row['source_sheet'],
            'source_row': row['source_row'],
            'values': json.loads(row['data_json']),
            'updated_at': row.get('updated_at'),
            'updated_by': row.get('updated_by')
        } for row in rows])

    data = request.json or {}
    project_code = clean_master_value(data.get('project_code'))
    sheet_name = clean_master_value(data.get('source_sheet'))
    if not project_code or sheet_name not in MASTERDATA_SHEETS:
        return jsonify({'error': 'Dự án và danh mục master data là bắt buộc!'}), 400
    if not check_project_region(project_code, user):
        return jsonify({'error': 'Bạn không có quyền sửa dự án ở vùng khác!'}), 403

    values = normalize_master_values(data.get('values') or {}, sheet_name)
    values['Mã dự án'] = project_code
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT COALESCE(MAX(source_row), 1) AS max_row
            FROM masterdata_entries
            WHERE project_code = ? AND source_sheet = ?
        ''', (project_code, sheet_name))
        source_row = int(cursor.fetchone()['max_row']) + 1
        cursor.execute('''
            INSERT INTO masterdata_entries (
                project_code, source_sheet, source_row, data_json,
                updated_at, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            project_code, sheet_name, source_row,
            json.dumps(values, ensure_ascii=False),
            datetime.now().isoformat(timespec='seconds'),
            session.get('username', '')
        ))
        entry_id = cursor.lastrowid
        conn.commit()
        return jsonify({'success': True, 'id': entry_id, 'source_row': source_row})
    except Exception as ex:
        conn.rollback()
        return jsonify({'error': f'Không thể lưu master data: {ex}'}), 500
    finally:
        conn.close()

@app.route('/api/masterdata/entries/<int:entry_id>', methods=['PUT', 'DELETE'])
def manage_masterdata_entry(entry_id):
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM masterdata_entries WHERE id = ?', (entry_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Không tìm thấy bản ghi master data!'}), 404
    entry = dict(row)
    if not check_project_region(entry['project_code'], user):
        conn.close()
        return jsonify({'error': 'Bạn không có quyền sửa dự án ở vùng khác!'}), 403

    if request.method == 'DELETE':
        cursor.execute('DELETE FROM masterdata_entries WHERE id = ?', (entry_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    data = request.json or {}
    sheet_name = entry['source_sheet']
    values = normalize_master_values(data.get('values') or {}, sheet_name)
    values['Mã dự án'] = entry['project_code']
    cursor.execute('''
        UPDATE masterdata_entries
        SET data_json = ?, updated_at = ?, updated_by = ?
        WHERE id = ?
    ''', (
        json.dumps(values, ensure_ascii=False),
        datetime.now().isoformat(timespec='seconds'),
        session.get('username', ''), entry_id
    ))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': entry_id})

def get_masterdata_export_rows(user, project_code=''):
    conn = get_db_connection()
    cursor = conn.cursor()
    params = []
    conditions = []
    if project_code:
        if not check_project_region(project_code, user):
            conn.close()
            return None
        conditions.append('m.project_code = ?')
        params.append(project_code)
    if user['role'] != 'admin':
        conditions.append('p.khu_vuc LIKE ?')
        params.append(f"%{user['region_keyword']}%")
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ''
    cursor.execute(f'''
        SELECT m.* FROM masterdata_entries m
        LEFT JOIN projects p ON p.ma_du_an = m.project_code
        {where_sql}
        ORDER BY m.project_code ASC, m.source_sheet ASC, m.source_row ASC
    ''', tuple(params))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    rows.sort(key=lambda row: (
        row['project_code'],
        MASTERDATA_SHEETS.get(row['source_sheet'], {}).get('sort', 999),
        row['source_sheet'], row['source_row']
    ))
    return rows

@app.route('/api/masterdata/export-fact', methods=['GET'])
def export_fact_masterdata():
    user = get_current_user()
    project_code = clean_master_value(request.args.get('project_code'))
    rows = get_masterdata_export_rows(user, project_code)
    if rows is None:
        return jsonify({'error': 'Bạn không có quyền xuất dự án ở vùng khác!'}), 403

    output = StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=FACT_MASTERDATA_COLUMNS)
    writer.writeheader()
    writer.writerows(build_fact_masterdata_row(row) for row in rows)
    binary = BytesIO(output.getvalue().encode('utf-8-sig'))
    binary.seek(0)
    return send_file(
        binary,
        as_attachment=True,
        download_name='Fact_MasterData.csv',
        mimetype='text/csv; charset=utf-8'
    )

@app.route('/api/masterdata/export-template', methods=['GET'])
def export_masterdata_template():
    user = get_current_user()
    project_code = clean_master_value(request.args.get('project_code'))
    rows = get_masterdata_export_rows(user, project_code)
    if rows is None:
        return jsonify({'error': 'Bạn không có quyền xuất dự án ở vùng khác!'}), 403
    if not os.path.exists(MASTERDATA_TEMPLATE_PATH):
        return jsonify({'error': 'Không tìm thấy workbook template trên máy chủ!'}), 500

    workbook = openpyxl.load_workbook(MASTERDATA_TEMPLATE_PATH)
    rows_by_sheet = {sheet_name: [] for sheet_name in MASTERDATA_SHEETS}
    for row in rows:
        rows_by_sheet[row['source_sheet']].append(json.loads(row['data_json']))

    for sheet_name, config in MASTERDATA_SHEETS.items():
        worksheet = workbook[sheet_name]
        if worksheet.max_row > 1:
            worksheet.delete_rows(2, worksheet.max_row - 1)
        for values in rows_by_sheet[sheet_name]:
            worksheet.append([values.get(header, '') for header in config['headers']])

    overview = workbook['Tổng quan dự án']
    if overview.max_row > 1:
        overview.delete_rows(2, overview.max_row - 1)
    conn = get_db_connection()
    cursor = conn.cursor()
    project_params = []
    project_conditions = []
    if project_code:
        project_conditions.append('ma_du_an = ?')
        project_params.append(project_code)
    if user['role'] != 'admin':
        project_conditions.append('khu_vuc LIKE ?')
        project_params.append(f"%{user['region_keyword']}%")
    project_where = f"WHERE {' AND '.join(project_conditions)}" if project_conditions else ''
    cursor.execute(
        f'SELECT * FROM projects {project_where} ORDER BY ma_du_an ASC',
        tuple(project_params)
    )
    projects = [dict(row) for row in cursor.fetchall()]
    conn.close()
    for project in projects:
        overview.append([
            project.get('ma_du_an'),
            project.get('ten_phap_ly') or project.get('ten_du_an'),
            project.get('ten_thuong_mai'),
            project.get('chu_dau_tu'),
            project.get('dia_diem_du_an'),
            project.get('tong_dien_tich_ha'),
            project.get('so_luong_san_pham')
        ])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return send_file(
        output,
        as_attachment=True,
        download_name='Template_Nhap_Lieu_Master_Data_Du_An.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

# API: Departments Config by Project
@app.route('/api/projects/<ma_du_an>/departments', methods=['GET'])
def get_project_departments(ma_du_an):
    user = get_current_user()
    if not check_project_region(ma_du_an, user):
        return jsonify({'error': 'Bạn không có quyền truy cập dự án ở vùng khác!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM project_departments 
        WHERE ma_du_an = ? 
        ORDER BY name_oc ASC
    ''', (ma_du_an,))
    depts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(depts)

@app.route('/api/project-departments', methods=['POST'])
def add_project_department():
    user = get_current_user()
    data = request.json
    ma_du_an = str(data.get('ma_du_an', '')).strip()
    ma_oc = str(data.get('ma_oc', '')).strip().upper()
    name_oc = clean_department_name(str(data.get('name_oc', '')).strip())
    
    if not ma_du_an or not ma_oc or not name_oc:
        return jsonify({'error': 'Mã dự án, Mã OC và Tên OC là bắt buộc!'}), 400
        
    if not check_project_region(ma_du_an, user):
        return jsonify({'error': 'Bạn không có quyền sửa đổi dự án ở vùng khác!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT OR REPLACE INTO project_departments (ma_du_an, ma_oc, name_oc)
            VALUES (?, ?, ?)
        ''', (ma_du_an, ma_oc, name_oc))
        dept_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': dept_id})
    except Exception as ex:
        conn.close()
        return jsonify({'error': str(ex)}), 500

@app.route('/api/departments/distinct', methods=['GET'])
def get_distinct_departments():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            SELECT DISTINCT ma_oc, name_oc FROM (
                SELECT ma_oc, name_oc FROM project_departments WHERE ma_oc IS NOT NULL AND name_oc IS NOT NULL AND ma_oc != ''
                UNION
                SELECT ma_oc, name_oc FROM org_allocations WHERE ma_oc IS NOT NULL AND name_oc IS NOT NULL AND ma_oc != ''
                UNION
                SELECT ma_oc, name_oc FROM common_allocations WHERE ma_oc IS NOT NULL AND name_oc IS NOT NULL AND ma_oc != ''
            ) ORDER BY name_oc ASC
        ''')
        depts = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(depts)
    except Exception as ex:
        conn.close()
        return jsonify({'error': str(ex)}), 500

@app.route('/api/project-departments/<int:dept_id>', methods=['DELETE'])
def delete_project_department(dept_id):
    user = get_current_user()
    if not check_dept_region(dept_id, user):
        return jsonify({'error': 'Bạn không có quyền sửa đổi dự án ở vùng khác!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM project_departments WHERE id = ?', (dept_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as ex:
        conn.close()
        return jsonify({'error': str(ex)}), 500

@app.route('/api/project-departments/copy', methods=['POST'])
def copy_project_departments():
    user = get_current_user()
    data = request.json
    from_proj = data.get('from_project')
    to_proj = data.get('to_project')
    if not from_proj or not to_proj:
        return jsonify({'error': 'Thiếu dự án nguồn hoặc dự án đích!'}), 400
        
    if not check_project_region(from_proj, user) or not check_project_region(to_proj, user):
        return jsonify({'error': 'Bạn không có quyền sửa đổi dự án ở vùng khác!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT ma_oc, name_oc FROM project_departments WHERE ma_du_an = ?', (from_proj,))
        depts = cursor.fetchall()
        for d in depts:
            cursor.execute('''
                INSERT OR IGNORE INTO project_departments (ma_du_an, ma_oc, name_oc)
                VALUES (?, ?, ?)
            ''', (to_proj, d['ma_oc'], d['name_oc']))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as ex:
        conn.close()
        return jsonify({'error': str(ex)}), 500

# API: Allocations (Org) CRUD
@app.route('/api/allocations', methods=['GET', 'POST'])
def manage_allocations():
    user = get_current_user()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        proj_filter = request.args.get('project')
        rgn_filter = request.args.get('region')
        dept_filter = request.args.get('department')
        title_filter = request.args.get('title')
        search_filter = request.args.get('search')
        status_filter = request.args.get('status')
        class_filter = request.args.get('classification')
        
        query = '''
            SELECT a.*, p.ten_du_an, e.ho_ten, e.email 
            FROM org_allocations a
            LEFT JOIN projects p ON a.ma_du_an = p.ma_du_an
            LEFT JOIN employees e ON a.ma_nhan_vien = e.ma_nhan_vien
            WHERE 1=1
        '''
        params = []
        
        if user['role'] != 'admin':
            query += ' AND (a.vung LIKE ? OR p.khu_vuc LIKE ?)'
            params.extend([f"%{user['region_keyword']}%", f"%{user['region_keyword']}%"])
        
        if proj_filter:
            query += ' AND (a.ma_du_an = ? OR p.ten_du_an = ?)'
            params.extend([proj_filter, proj_filter])
        if rgn_filter:
            query += ' AND (a.vung = ? OR p.khu_vuc = ?)'
            params.extend([rgn_filter, rgn_filter])
        if dept_filter:
            query += ' AND a.name_oc = ?'
            params.append(dept_filter)
        if title_filter:
            query += ' AND a.chuc_danh = ?'
            params.append(title_filter)
        if class_filter:
            query += ' AND a.phan_loai_oc = ?'
            params.append(class_filter)
        if status_filter == 'employee':
            query += " AND a.ma_nhan_vien NOT IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')"
        elif status_filter == 'hiring':
            query += " AND a.ma_nhan_vien IN ('Tuyển0', 'Tuyển1', 'Tuyển', 'Không tuyển', 'Không tồn tại', 'Chưa tuyển', 'Tuyến1')"
            
        if search_filter:
            query += ' AND (a.ma_nhan_vien LIKE ? OR e.ho_ten LIKE ? OR a.chuc_danh LIKE ? OR a.ma_du_an LIKE ?)'
            like_pat = f'%{search_filter}%'
            params.extend([like_pat, like_pat, like_pat, like_pat])
            
        query += ' ORDER BY a.id DESC LIMIT 2000'
        
        cursor.execute(query, params)
        allocs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(allocs)
        
    elif request.method == 'POST':
        data = request.json
        ma_da = str(data.get('ma_du_an', '')).strip()
        ma_nv = str(data.get('ma_nhan_vien', 'Tuyển0')).strip()
        ma_oc = str(data.get('ma_oc', '')).strip()
        name_oc = clean_department_name(str(data.get('name_oc', '')).strip())
        chuc_danh = str(data.get('chuc_danh', '')).strip()
        tinh_trang = str(data.get('tinh_trang', '')).strip()
        ghi_chu = str(data.get('ghi_chu', '')).strip()
        vung = str(data.get('vung', '')).strip()
        
        if not ma_da or not chuc_danh or not name_oc:
            return jsonify({'error': 'Mã dự án, Phòng ban và Chức danh là bắt buộc!'}), 400
            
        if not check_project_region(ma_da, user):
            return jsonify({'error': 'Bạn không có quyền phân bổ cho dự án ở vùng khác!'}), 403
            
        if user['role'] != 'admin':
            if not vung or user['region_keyword'] not in vung:
                vung = f"Ban điều hành Dự án Vùng {user['region_keyword']} 1"
            
        if not is_placeholder_id(ma_nv):
            cursor.execute('SELECT * FROM employees WHERE ma_nhan_vien = ?', (ma_nv,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': f'Không tồn tại nhân viên với mã {ma_nv}! Bạn cần tạo hồ sơ nhân viên trước.'}), 400
                
        # Auto-create department configuration for project if not exists
        if ma_oc:
            cursor.execute('''
                INSERT OR IGNORE INTO project_departments (ma_du_an, ma_oc, name_oc)
                VALUES (?, ?, ?)
            ''', (ma_da, ma_oc, name_oc))
            
        phan_loai_oc = classify_oc(ma_oc)
        cursor.execute('''
            INSERT INTO org_allocations (ma_du_an, ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, vung, phan_loai_oc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (ma_da, ma_nv, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, vung, phan_loai_oc))
        alloc_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': alloc_id})

@app.route('/api/allocations/<int:alloc_id>', methods=['PUT', 'DELETE'])
def manage_single_allocation(alloc_id):
    user = get_current_user()
    if not check_allocation_region(alloc_id, user):
        return jsonify({'error': 'Bạn không có quyền sửa đổi phân bổ ở vùng khác!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM org_allocations WHERE id = ?', (alloc_id,))
    alloc = cursor.fetchone()
    if not alloc:
        conn.close()
        return jsonify({'error': 'Không tìm thấy thông tin phân bổ!'}), 404
        
    if request.method == 'PUT':
        data = request.json
        ma_da = str(data.get('ma_du_an', alloc['ma_du_an'])).strip()
        ma_nv = str(data.get('ma_nhan_vien', alloc['ma_nhan_vien'])).strip()
        ma_oc = str(data.get('ma_oc', alloc['ma_oc'])).strip()
        name_oc = clean_department_name(str(data.get('name_oc', alloc['name_oc'])).strip())
        chuc_danh = str(data.get('chuc_danh', alloc['chuc_danh'])).strip()
        tinh_trang = str(data.get('tinh_trang', alloc['tinh_trang'])).strip()
        ghi_chu = str(data.get('ghi_chu', alloc['ghi_chu'])).strip()
        vung = str(data.get('vung', alloc['vung'])).strip()
        
        if not ma_da or not chuc_danh or not name_oc:
            return jsonify({'error': 'Mã dự án, Phòng ban và Chức danh là bắt buộc!'}), 400
            
        if not check_project_region(ma_da, user):
            return jsonify({'error': 'Bạn không có quyền phân bổ cho dự án ở vùng khác!'}), 403
            
        if user['role'] != 'admin':
            if not vung or user['region_keyword'] not in vung:
                vung = f"Ban điều hành Dự án Vùng {user['region_keyword']} 1"
            
        if not is_placeholder_id(ma_nv):
            cursor.execute('SELECT * FROM employees WHERE ma_nhan_vien = ?', (ma_nv,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': f'Không tồn tại nhân viên với mã {ma_nv}!'}), 400
                
        # Auto-create department config if not exists
        if ma_oc:
            cursor.execute('''
                INSERT OR IGNORE INTO project_departments (ma_du_an, ma_oc, name_oc)
                VALUES (?, ?, ?)
            ''', (ma_da, ma_oc, name_oc))
            
        phan_loai_oc = classify_oc(ma_oc)
        cursor.execute('''
            UPDATE org_allocations 
            SET ma_du_an = ?, ma_nhan_vien = ?, ma_oc = ?, name_oc = ?, chuc_danh = ?, tinh_trang = ?, ghi_chu = ?, vung = ?, phan_loai_oc = ?
            WHERE id = ?
        ''', (ma_da, ma_nv, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, vung, phan_loai_oc, alloc_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
        
    elif request.method == 'DELETE':
        cursor.execute('DELETE FROM org_allocations WHERE id = ?', (alloc_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

# API: Common Allocations (NS chung) CRUD
@app.route('/api/common-allocations', methods=['GET', 'POST'])
def manage_common_allocations():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        search_filter = request.args.get('search')
        query = '''
            SELECT c.*, e.ho_ten, e.email 
            FROM common_allocations c
            LEFT JOIN employees e ON c.ma_nhan_vien = e.ma_nhan_vien
            WHERE 1=1
        '''
        params = []
        if search_filter:
            query += ' AND (c.ma_nhan_vien LIKE ? OR e.ho_ten LIKE ? OR c.chuc_danh LIKE ? OR c.name_oc LIKE ?)'
            like_pat = f'%{search_filter}%'
            params.extend([like_pat, like_pat, like_pat, like_pat])
            
        query += ' ORDER BY c.id DESC'
        cursor.execute(query, params)
        common_allocs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(common_allocs)
        
    elif request.method == 'POST':
        user = get_current_user()
        if user['role'] != 'admin':
            return jsonify({'error': 'Chỉ Admin hệ thống mới có quyền sửa đổi Nhân sự Chung!'}), 403
            
        data = request.json
        ma_nv = str(data.get('ma_nhan_vien', 'Tuyển0')).strip()
        ma_oc = str(data.get('ma_oc', '')).strip()
        name_oc = clean_department_name(str(data.get('name_oc', '')).strip())
        chuc_danh = str(data.get('chuc_danh', '')).strip()
        tinh_trang = str(data.get('tinh_trang', '')).strip()
        ghi_chu = str(data.get('ghi_chu', '')).strip()
        
        if not chuc_danh or not name_oc:
            return jsonify({'error': 'Phòng ban và Chức danh là bắt buộc!'}), 400
            
        if not is_placeholder_id(ma_nv):
            cursor.execute('SELECT * FROM employees WHERE ma_nhan_vien = ?', (ma_nv,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': f'Không tồn tại nhân viên với mã {ma_nv}! Cần tạo hồ sơ trước.'}), 400
                
        cursor.execute('''
            INSERT INTO common_allocations (ma_nhan_vien, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (ma_nv, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu))
        alloc_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'id': alloc_id})

@app.route('/api/common-allocations/<int:alloc_id>', methods=['PUT', 'DELETE'])
def manage_single_common_allocation(alloc_id):
    user = get_current_user()
    if user['role'] != 'admin':
        return jsonify({'error': 'Chỉ Admin hệ thống mới có quyền sửa đổi Nhân sự Chung!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM common_allocations WHERE id = ?', (alloc_id,))
    alloc = cursor.fetchone()
    if not alloc:
        conn.close()
        return jsonify({'error': 'Không tìm thấy bản ghi nhân sự chung!'}), 404
        
    if request.method == 'PUT':
        data = request.json
        ma_nv = str(data.get('ma_nhan_vien', alloc['ma_nhan_vien'])).strip()
        ma_oc = str(data.get('ma_oc', alloc['ma_oc'])).strip()
        name_oc = clean_department_name(str(data.get('name_oc', alloc['name_oc'])).strip())
        chuc_danh = str(data.get('chuc_danh', alloc['chuc_danh'])).strip()
        tinh_trang = str(data.get('tinh_trang', alloc['tinh_trang'])).strip()
        ghi_chu = str(data.get('ghi_chu', alloc['ghi_chu'])).strip()
        
        if not chuc_danh or not name_oc:
            return jsonify({'error': 'Phòng ban và Chức danh là bắt buộc!'}), 400
            
        if not is_placeholder_id(ma_nv):
            cursor.execute('SELECT * FROM employees WHERE ma_nhan_vien = ?', (ma_nv,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': f'Không tồn tại nhân viên với mã {ma_nv}!'}), 400
                
        cursor.execute('''
            UPDATE common_allocations 
            SET ma_nhan_vien = ?, ma_oc = ?, name_oc = ?, chuc_danh = ?, tinh_trang = ?, ghi_chu = ?
            WHERE id = ?
        ''', (ma_nv, ma_oc, name_oc, chuc_danh, tinh_trang, ghi_chu, alloc_id))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
        
    elif request.method == 'DELETE':
        cursor.execute('DELETE FROM common_allocations WHERE id = ?', (alloc_id,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

# API: Transfer / Rotation
@app.route('/api/transfer', methods=['POST'])
def transfer_employee():
    user = get_current_user()
    data = request.json
    alloc_id = data.get('allocation_id')
    ma_nv = str(data.get('ma_nhan_vien', '')).strip()
    tu_da = str(data.get('tu_du_an', '')).strip()
    den_da = str(data.get('den_du_an', '')).strip()
    tu_pb = clean_department_name(str(data.get('tu_phong_ban', '')).strip())
    den_pb = clean_department_name(str(data.get('den_phong_ban', '')).strip())
    tu_cd = str(data.get('tu_chuc_danh', '')).strip()
    den_cd = str(data.get('den_chuc_danh', '')).strip()
    ngay_lc = str(data.get('ngay_luan_chuyen', '')).strip()
    ly_do = str(data.get('ly_do', '')).strip()
    ghi_chu = str(data.get('ghi_chu', '')).strip()
    
    if not ma_nv or not den_da or not den_cd or not den_pb:
        return jsonify({'error': 'Thiếu thông tin luân chuyển bắt buộc (Mã NV, Dự án đến, Phòng ban đến, Chức danh đến)!'}), 400
        
    if not check_project_region(den_da, user):
        return jsonify({'error': 'Dự án đến phải thuộc vùng bạn quản lý!'}), 403
        
    if alloc_id and not check_allocation_region(alloc_id, user):
        return jsonify({'error': 'Dự án đi phải thuộc vùng bạn quản lý!'}), 403
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Try to find OC code for den_pb from project_departments if it exists
    cursor.execute('SELECT ma_oc FROM project_departments WHERE ma_du_an = ? AND name_oc = ? LIMIT 1', (den_da, den_pb))
    row_oc = cursor.fetchone()
    ma_oc = row_oc['ma_oc'] if row_oc else 'MISC'
    
    phan_loai_oc = classify_oc(ma_oc)
    
    # Auto-add department configuration for target project
    cursor.execute('''
        INSERT OR IGNORE INTO project_departments (ma_du_an, ma_oc, name_oc)
        VALUES (?, ?, ?)
    ''', (den_da, ma_oc, den_pb))
    
    if alloc_id:
        cursor.execute('''
            UPDATE org_allocations 
            SET ma_du_an = ?, ma_oc = ?, name_oc = ?, chuc_danh = ?, phan_loai_oc = ?, ghi_chu = ?
            WHERE id = ?
        ''', (den_da, ma_oc, den_pb, den_cd, phan_loai_oc, ghi_chu, alloc_id))
    else:
        cursor.execute('''
            INSERT INTO org_allocations (ma_du_an, ma_nhan_vien, ma_oc, name_oc, chuc_danh, phan_loai_oc, ghi_chu)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (den_da, ma_nv, ma_oc, den_pb, den_cd, phan_loai_oc, ghi_chu))
        
    cursor.execute('''
        INSERT INTO transfer_history (ma_nhan_vien, tu_du_an, den_du_an, tu_phong_ban, den_phong_ban, tu_chuc_danh, den_chuc_danh, ngay_luan_chuyen, ly_do, ghi_chu)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (ma_nv, tu_da, den_da, tu_pb, den_pb, tu_cd, den_cd, ngay_lc, ly_do, ghi_chu))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/transfer/history/<ma_nhan_vien>', methods=['GET'])
def get_transfer_history(ma_nhan_vien):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM transfer_history WHERE ma_nhan_vien = ? ORDER BY ngay_luan_chuyen DESC', (ma_nhan_vien,))
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(history)

# API: Evaluations
@app.route('/api/evaluations/<ma_nhan_vien>', methods=['GET', 'POST'])
def manage_evaluations(ma_nhan_vien):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute('SELECT * FROM evaluations WHERE ma_nhan_vien = ? ORDER BY ngay_danh_gia DESC', (ma_nhan_vien,))
        evals = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(evals)
        
    elif request.method == 'POST':
        data = request.json
        ngay_dg = str(data.get('ngay_danh_gia', '')).strip()
        nguoi_dg = str(data.get('nguoi_danh_gia', '')).strip()
        diem_so = int(data.get('diem_so', 5))
        nang_luc = json.dumps(data.get('nang_luc', {}))
        uu_diem = str(data.get('uu_diem', '')).strip()
        nhuoc_diem = str(data.get('nhuoc_diem', '')).strip()
        nhan_xet = str(data.get('nhan_xet_chung', '')).strip()
        
        cursor.execute('''
            INSERT INTO evaluations (ma_nhan_vien, ngay_danh_gia, nguoi_danh_gia, diem_so, nang_luc, uu_diem, nhuoc_diem, nhan_xet_chung)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (ma_nhan_vien, ngay_dg, nguoi_dg, diem_so, nang_luc, uu_diem, nhuoc_diem, nhan_xet))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})

# API: Sync back to Excel
@app.route('/api/excel/sync', methods=['POST'])
def sync_to_excel():
    user = get_current_user()
    if user['role'] != 'admin':
        return jsonify({'error': 'Chỉ Admin mới có quyền đồng bộ hóa Excel!'}), 403
    try:
        backup_path = EXCEL_PATH + '.bak'
        shutil.copy(EXCEL_PATH, backup_path)
        
        wb = openpyxl.load_workbook(EXCEL_PATH)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Sync Org Allocations back to 'Org' sheet
        if 'Org' in wb.sheetnames:
            ws_org = wb['Org']
            ws_org.delete_rows(2, ws_org.max_row)
            
            cursor.execute('''
                SELECT a.ma_du_an, a.ma_nhan_vien, a.ma_oc, a.name_oc, a.chuc_danh, 
                       e.ho_ten as ocd_name, a.tinh_trang, a.ghi_chu, a.vung
                FROM org_allocations a
                LEFT JOIN employees e ON a.ma_nhan_vien = e.ma_nhan_vien
            ''')
            allocs = cursor.fetchall()
            
            for alloc in allocs:
                try:
                    emp_val = int(alloc['ma_nhan_vien'])
                except ValueError:
                    emp_val = alloc['ma_nhan_vien']
                    
                ws_org.append([
                    alloc['ma_du_an'],
                    emp_val,
                    alloc['ma_oc'],
                    alloc['name_oc'],
                    alloc['chuc_danh'],
                    None, # Thứ tự
                    alloc['tinh_trang'],
                    alloc['ghi_chu'],
                    alloc['ocd_name'] if not is_placeholder_id(alloc['ma_nhan_vien']) else None, # OCD
                    None, # ITD
                    None, # HRBP
                    alloc['vung']
                ])
                
        # 2. Sync Shared/Common Allocations back to 'NS chung' sheet
        if 'NS chung' in wb.sheetnames:
            ws_ns = wb['NS chung']
            ws_ns.delete_rows(2, ws_ns.max_row)
            
            cursor.execute('''
                SELECT c.ma_nhan_vien, c.ma_oc, c.name_oc, c.chuc_danh, 
                       e.ho_ten as ocd_name, c.tinh_trang, c.ghi_chu
                FROM common_allocations c
                LEFT JOIN employees e ON c.ma_nhan_vien = e.ma_nhan_vien
            ''')
            common_allocs = cursor.fetchall()
            
            for alloc in common_allocs:
                try:
                    emp_val = int(alloc['ma_nhan_vien'])
                except ValueError:
                    emp_val = alloc['ma_nhan_vien']
                    
                ws_ns.append([
                    None,
                    emp_val,
                    alloc['ma_oc'],
                    alloc['name_oc'],
                    alloc['chuc_danh'],
                    None,
                    alloc['tinh_trang'],
                    alloc['ghi_chu'],
                    alloc['ocd_name'] if not is_placeholder_id(alloc['ma_nhan_vien']) else None, # OCD
                    None,
                    None
                ])
                
        # 3. Sync Projects back to 'Dự án' sheet
        if 'Dự án' in wb.sheetnames:
            ws_proj = wb['Dự án']
            ws_proj.delete_rows(2, ws_proj.max_row)
            
            cursor.execute('SELECT * FROM projects')
            projs = cursor.fetchall()
            for p in projs:
                ws_proj.append([
                    p['khu_vuc'],
                    None,
                    p['ma_du_an'],
                    p['ma_du_an'],
                    p['ten_du_an'],
                    p['trang_thai'],
                    p['nhom'],
                    p['quan_ly'],
                    None,
                    p['ma_du_an'] # ITD Check
                ])
                
        # 4. Sync Employees to 'Nhân viên(Đã có)' sheet
        if 'Nhân viên(Đã có)' in wb.sheetnames:
            ws_emp = wb['Nhân viên(Đã có)']
            ws_emp.delete_rows(2, ws_emp.max_row)
            
            cursor.execute('SELECT * FROM employees')
            emps = cursor.fetchall()
            for e in emps:
                ws_emp.append([
                    e['ma_nhan_vien'],
                    e['ho_ten'],
                    "Nhân viên",
                    "N/A"
                ])
                
        wb.save(EXCEL_PATH)
        conn.close()
        return jsonify({'success': True, 'message': 'Đồng bộ hóa dữ liệu ra file Excel thành công và đã tạo bản sao lưu!'})
        
    except Exception as ex:
        return jsonify({'error': f'Lỗi khi đồng bộ Excel: {str(ex)}'}), 500

if __name__ == '__main__':
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    # debug=True bật Werkzeug debugger, cho phép thực thi code tùy ý từ trình duyệt.
    # Chỉ bật khi tự đặt FLASK_DEBUG=true, và mặc định chỉ nghe trên localhost.
    app.run(
        debug=env_flag('FLASK_DEBUG', False),
        host=os.environ.get('FLASK_HOST', '127.0.0.1'),
        port=int(os.environ.get('PORT', '5000'))
    )
