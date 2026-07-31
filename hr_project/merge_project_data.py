"""Merge project master data from data_duan.xlsx into SQLite.

Only rows with a non-empty "Nhóm dự án" are imported. Existing projects are
updated by "Mã dự án"; missing projects are inserted. Empty source values never
overwrite existing values, and "Quy mô (m2)" is converted to hectares.
"""

import argparse
import sqlite3
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

import openpyxl


REQUIRED_HEADERS = {
    'STT',
    'Tổng công ty',
    'Chủ đầu tư',
    'Hiện trạng đầu tư',
    'Mã dự án',
    'Nhóm dự án',
    'Tên dự án',
    'Địa chỉ/ vị trí dự án',
    'Khu vực',
    'Tỉnh cũ',
    'Tỉnh mới',
    'Loại hình',
    'Quy mô (m2)',
    'Mức độ ưu tiên',
}

LEGACY_RENAMES = {
    'trang_thai': 'hien_trang_dau_tu',
    'nhom': 'nhom_du_an',
}

ADDITIONAL_COLUMNS = {
    'source_stt': 'TEXT',
    'tong_cong_ty': 'TEXT',
    'tinh_cu': 'TEXT',
    'tinh_moi': 'TEXT',
    'loai_hinh': 'TEXT',
    'muc_do_uu_tien': 'TEXT',
}

MERGE_COLUMNS = [
    'ten_du_an',
    'khu_vuc',
    'hien_trang_dau_tu',
    'nhom_du_an',
    'chu_dau_tu',
    'dia_diem_du_an',
    'tong_dien_tich_ha',
    'source_stt',
    'tong_cong_ty',
    'tinh_cu',
    'tinh_moi',
    'loai_hinh',
    'muc_do_uu_tien',
]


def clean_text(value):
    if value is None:
        return None
    value = ' '.join(str(value).replace('\xa0', ' ').split())
    if not value or value.casefold() in {'n/a', 'null', 'nan'} or value == '...':
        return None
    return value


def clean_source_id(value):
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return clean_text(value)


def square_metres_to_hectares(value):
    try:
        square_metres = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if square_metres <= 0:
        return None
    hectares = square_metres / Decimal('10000')
    return format(hectares.normalize(), 'f')


def load_source_rows(excel_path):
    workbook = openpyxl.load_workbook(excel_path, data_only=True)
    try:
        if 'Export' not in workbook.sheetnames:
            raise ValueError('Không tìm thấy sheet Export trong file nguồn.')
        worksheet = workbook['Export']
        headers = [clean_text(cell.value) or '' for cell in worksheet[1]]
        missing_headers = REQUIRED_HEADERS - set(headers)
        if missing_headers:
            raise ValueError(
                'File nguồn thiếu cột bắt buộc: ' + ', '.join(sorted(missing_headers))
            )

        result = []
        seen_codes = set()
        for row_number, values in enumerate(
            worksheet.iter_rows(min_row=2, values_only=True),
            start=2,
        ):
            source = dict(zip(headers, values))
            project_code = clean_text(source.get('Mã dự án'))
            project_group = clean_text(source.get('Nhóm dự án'))
            if not project_code or not project_group:
                continue
            if project_code in seen_codes:
                raise ValueError(
                    f'Mã dự án {project_code!r} bị trùng tại dòng {row_number}.'
                )
            seen_codes.add(project_code)
            result.append({
                'ma_du_an': project_code,
                'ten_du_an': clean_text(source.get('Tên dự án')) or project_code,
                'khu_vuc': clean_text(source.get('Khu vực')),
                'hien_trang_dau_tu': clean_text(source.get('Hiện trạng đầu tư')),
                'nhom_du_an': project_group,
                'chu_dau_tu': clean_text(source.get('Chủ đầu tư')),
                'dia_diem_du_an': clean_text(source.get('Địa chỉ/ vị trí dự án')),
                'tong_dien_tich_ha': square_metres_to_hectares(
                    source.get('Quy mô (m2)')
                ),
                'source_stt': clean_source_id(source.get('STT')),
                'tong_cong_ty': clean_text(source.get('Tổng công ty')),
                'tinh_cu': clean_text(source.get('Tỉnh cũ')),
                'tinh_moi': clean_text(source.get('Tỉnh mới')),
                'loai_hinh': clean_text(source.get('Loại hình')),
                'muc_do_uu_tien': clean_source_id(source.get('Mức độ ưu tiên')),
            })
        return result
    finally:
        workbook.close()


def ensure_project_schema(connection):
    columns = {
        row['name']
        for row in connection.execute('PRAGMA table_info(projects)').fetchall()
    }
    for legacy_name, current_name in LEGACY_RENAMES.items():
        if legacy_name in columns and current_name not in columns:
            connection.execute(
                f'ALTER TABLE projects RENAME COLUMN {legacy_name} TO {current_name}'
            )
            columns.remove(legacy_name)
            columns.add(current_name)
    for column_name, column_type in ADDITIONAL_COLUMNS.items():
        if column_name not in columns:
            connection.execute(
                f'ALTER TABLE projects ADD COLUMN {column_name} {column_type}'
            )
            columns.add(column_name)

    required_database_columns = {
        'ma_du_an',
        'ten_du_an',
        'hien_trang_dau_tu',
        'nhom_du_an',
        *ADDITIONAL_COLUMNS,
    }
    missing_columns = required_database_columns - columns
    if missing_columns:
        raise ValueError(
            'Bảng projects thiếu cột: ' + ', '.join(sorted(missing_columns))
        )


def merge(database_path, source_rows, apply_changes=False):
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute('BEGIN IMMEDIATE' if apply_changes else 'BEGIN')
        ensure_project_schema(connection)
        existing_codes = {
            row['ma_du_an']
            for row in connection.execute('SELECT ma_du_an FROM projects')
        }
        inserted = sum(row['ma_du_an'] not in existing_codes for row in source_rows)
        updated = len(source_rows) - inserted

        column_sql = ', '.join(['ma_du_an', *MERGE_COLUMNS, 'updated_at', 'updated_by'])
        placeholders = ', '.join('?' for _ in range(len(MERGE_COLUMNS) + 3))
        update_sql = ', '.join(
            f'{column}=COALESCE(excluded.{column}, projects.{column})'
            for column in MERGE_COLUMNS
        )
        update_sql += (
            ', updated_at=excluded.updated_at, updated_by=excluded.updated_by'
        )
        sql = f'''
            INSERT INTO projects ({column_sql})
            VALUES ({placeholders})
            ON CONFLICT(ma_du_an) DO UPDATE SET {update_sql}
        '''
        imported_at = datetime.now().isoformat(timespec='seconds')
        for row in source_rows:
            params = [
                row['ma_du_an'],
                *(row[column] for column in MERGE_COLUMNS),
                imported_at,
                'data_duan.xlsx-merge',
            ]
            connection.execute(sql, params)

        if apply_changes:
            connection.commit()
        else:
            connection.rollback()
        return {
            'selected': len(source_rows),
            'inserted': inserted,
            'updated': updated,
            'applied': apply_changes,
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(
        description='Merge các dự án có Nhóm dự án từ data_duan.xlsx vào SQLite.'
    )
    parser.add_argument('--database', default='hr_management.db')
    parser.add_argument('--excel', default='data_duan.xlsx')
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Thực sự ghi thay đổi; mặc định chỉ kiểm tra rồi rollback.',
    )
    args = parser.parse_args()

    database_path = Path(args.database).resolve()
    excel_path = Path(args.excel).resolve()
    if not database_path.is_file():
        raise FileNotFoundError(database_path)
    if not excel_path.is_file():
        raise FileNotFoundError(excel_path)

    source_rows = load_source_rows(excel_path)
    result = merge(database_path, source_rows, apply_changes=args.apply)
    mode = 'ĐÃ GHI' if result['applied'] else 'DRY RUN'
    print(
        f"{mode}: chọn {result['selected']} dòng có nhóm; "
        f"cập nhật {result['updated']}; thêm mới {result['inserted']}."
    )


if __name__ == '__main__':
    main()
