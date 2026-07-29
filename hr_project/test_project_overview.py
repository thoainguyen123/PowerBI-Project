import os
import csv
import shutil
import tempfile
import unittest
from io import BytesIO, StringIO
from pathlib import Path

import openpyxl


PROJECT_ROOT = Path(__file__).resolve().parent
TEMP_DIRECTORY = tempfile.TemporaryDirectory()
TEST_DATABASE = Path(TEMP_DIRECTORY.name) / 'hr_management.test.db'
shutil.copy2(PROJECT_ROOT / 'hr_management.db', TEST_DATABASE)

os.environ['USE_POSTGRES'] = 'false'
os.environ['DB_PATH'] = str(TEST_DATABASE)
os.environ['USER_PASSWORD'] = 'test123'
# app.py yêu cầu SECRET_KEY, đặt ở đây để test chạy được cả trên máy không có .env
os.environ['SECRET_KEY'] = 'test-secret-key-not-for-production'
os.environ['MASTERDATA_TEMPLATE_PATH'] = str(
    PROJECT_ROOT.parent / 'NVLG_PROJECT' / 'Template_Nhap_Lieu_Master_Data_Du_An.xlsx'
)

from app import app  # noqa: E402


class ProjectOverviewApiTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        response = self.client.post(
            '/api/login',
            json={'username': 'admin', 'password': 'test123'}
        )
        self.assertEqual(response.status_code, 200)

    def create_test_project(self, project_code):
        return self.client.post('/api/projects', json={
            'ma_du_an': project_code,
            'ten_du_an': f'Dự án {project_code}',
            'khu_vuc': 'TP.HCM 1',
            'trang_thai': 'Đang nghiên cứu'
        })

    def test_masterdata_crud_and_fact_exports(self):
        home = self.client.get('/')
        self.assertIn(b'project-modal-masterdata-section', home.data)
        self.assertIn(b'masterdata-all-sections', home.data)
        self.assertIn(b'modal-masterdata', home.data)

        config_response = self.client.get('/api/masterdata/config')
        self.assertEqual(config_response.status_code, 200)
        config = config_response.get_json()
        self.assertEqual(len(config), 15)
        self.assertEqual(config[0]['nhom'], '9.1 HRC')
        self.assertEqual(config[-1]['nhom'], '4.4 OM')

        project_code = 'TEST.MD.001'
        created_project = self.create_test_project(project_code)
        self.assertEqual(
            created_project.status_code, 200,
            created_project.get_data(as_text=True)
        )
        values = {
            'Tổng nhân sự theo định biên': '20',
            'Đang làm việc': '12',
            'Sẽ tuyển dụng': '8',
            'Chi tiết': 'Kiểm thử mapping HRC',
            'Ghi chú': 'Nguồn app'
        }
        created = self.client.post('/api/masterdata/entries', json={
            'project_code': project_code,
            'source_sheet': 'HRC',
            'values': values
        })
        self.assertEqual(created.status_code, 200, created.get_data(as_text=True))
        entry_id = created.get_json()['id']

        entries = self.client.get(
            f'/api/masterdata/entries?project_code={project_code}'
        )
        self.assertEqual(entries.status_code, 200)
        self.assertEqual(len(entries.get_json()), 1)
        self.assertEqual(
            entries.get_json()[0]['values']['Mã dự án'], project_code
        )

        values['Đang làm việc'] = '13'
        updated = self.client.put(
            f'/api/masterdata/entries/{entry_id}',
            json={'values': values}
        )
        self.assertEqual(updated.status_code, 200)

        fact_export = self.client.get(
            f'/api/masterdata/export-fact?project_code={project_code}'
        )
        self.assertEqual(fact_export.status_code, 200)
        fact_text = fact_export.data.decode('utf-8-sig')
        fact_rows = list(csv.DictReader(StringIO(fact_text)))
        self.assertEqual(len(fact_rows), 1)
        self.assertEqual(fact_rows[0]['nhom'], '9.1 HRC')
        self.assertEqual(fact_rows[0]['sort_colum'], '1')
        self.assertEqual(fact_rows[0]['gia_tri_2'], '13')

        template_export = self.client.get(
            f'/api/masterdata/export-template?project_code={project_code}'
        )
        self.assertEqual(template_export.status_code, 200)
        workbook = openpyxl.load_workbook(
            BytesIO(template_export.data), read_only=True, data_only=True
        )
        self.assertEqual(len(workbook.sheetnames), 16)
        self.assertIn('Tổng quan dự án', workbook.sheetnames)
        self.assertIn('HRC', workbook.sheetnames)
        self.assertEqual(workbook['HRC']['A2'].value, project_code)
        self.assertEqual(workbook['HRC']['C2'].value, '13')

        deleted = self.client.delete(f'/api/masterdata/entries/{entry_id}')
        self.assertEqual(deleted.status_code, 200)

    def test_project_overview_crud_and_export(self):
        home = self.client.get('/')
        self.assertEqual(home.status_code, 200)
        self.assertIn(b'tab-projects', home.data)
        self.assertNotIn(b"switchTab('dashboard'", home.data)
        self.assertIn(b'id="tab-allocations" class="tab-content active"', home.data)
        self.assertIn(b'class="grid-stats allocation-kpis"', home.data)
        self.assertIn(b'href="/api/masterdata/export-template"', home.data)
        self.assertIn('Tải workbook 16 sheet'.encode('utf-8'), home.data)
        self.assertIn(b'modal-project', home.data)

        stats_before = self.client.get('/api/projects/overview-stats')
        self.assertEqual(stats_before.status_code, 200)

        payload = {
            'ma_du_an': 'TEST.CDX.001',
            'ten_du_an': 'Dự án kiểm thử Codex',
            'khu_vuc': 'TP.HCM 1',
            'trang_thai': 'Đang nghiên cứu',
            'nhom': 'Kiểm thử',
            'quan_ly': 'Ban điều hành test',
            'ten_phap_ly': 'Dự án pháp lý test',
            'ten_thuong_mai': 'Codex Riverside',
            'chu_dau_tu': 'NVL Test',
            'dia_diem_du_an': 'TP.HCM',
            'tong_dien_tich_ha': '12.5',
            'so_luong_san_pham': '850',
            'nguon_goc_du_an': 'Tự phát triển'
        }
        created = self.client.post('/api/projects', json=payload)
        self.assertEqual(created.status_code, 200, created.get_data(as_text=True))

        project = self.client.get('/api/projects/TEST.CDX.001')
        self.assertEqual(project.status_code, 200)
        self.assertEqual(project.get_json()['ten_thuong_mai'], 'Codex Riverside')

        payload['ten_thuong_mai'] = 'Codex Riverside Updated'
        updated = self.client.put('/api/projects/TEST.CDX.001', json=payload)
        self.assertEqual(updated.status_code, 200, updated.get_data(as_text=True))

        exported = self.client.get('/api/projects/export-overview')
        self.assertEqual(exported.status_code, 200)
        workbook = openpyxl.load_workbook(BytesIO(exported.data), read_only=True)
        self.assertIn('Tổng quan dự án', workbook.sheetnames)
        headers = [
            cell.value for cell in next(
                workbook['Tổng quan dự án'].iter_rows(min_row=1, max_row=1)
            )
        ]
        self.assertEqual(headers, [
            'Mã dự án',
            'Tên pháp lý dự án',
            'Tên thương mại',
            'Chủ đầu tư',
            'Địa điểm dự án',
            'Tổng diện tích (ha)',
            'Số lượng sản phẩm',
            'Nguồn gốc dự án'
        ])

        stats_after = self.client.get('/api/projects/overview-stats').get_json()
        self.assertEqual(
            stats_after['total'],
            stats_before.get_json()['total'] + 1
        )


if __name__ == '__main__':
    unittest.main()
