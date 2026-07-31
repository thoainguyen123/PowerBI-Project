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
template_path = PROJECT_ROOT.parent / 'NVLG_PROJECT' / 'Template_Nhap_Lieu_Master_Data_Du_An.xlsx'
if not template_path.exists():
    template_path = PROJECT_ROOT.parent / 'hr_project_repo' / 'NVLG_PROJECT' / 'Template_Nhap_Lieu_Master_Data_Du_An.xlsx'
os.environ['MASTERDATA_TEMPLATE_PATH'] = str(template_path)

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
            'hien_trang_dau_tu': 'Đang nghiên cứu',
            'nhom_du_an': 'Nhóm 1'
        })

    def test_masterdata_crud_and_fact_exports(self):
        home = self.client.get('/')
        self.assertIn(b'project-modal-masterdata-section', home.data)
        self.assertIn(b'masterdata-all-sections', home.data)
        self.assertIn(b'modal-masterdata', home.data)
        self.assertIn(b'onkeydown="preventProjectFormImplicitSubmit(event)"', home.data)

        config_response = self.client.get('/api/masterdata/config')
        self.assertEqual(config_response.status_code, 200)
        config = config_response.get_json()
        self.assertEqual(len(config), 15)
        self.assertEqual(config[0]['nhom'], '9.1 HRC')
        self.assertEqual(config[-1]['nhom'], '4.4 OM')
        config_by_sheet = {item['sheet']: item for item in config}
        self.assertIn('Thiết kế quy hoạch', config_by_sheet['IDD']['choices']['Mục'])
        self.assertEqual(config_by_sheet['PLP']['field_labels']['Nhóm'], 'Mục')
        self.assertEqual(config_by_sheet['PLP']['field_labels']['Hạng mục'], 'Nội dung')
        self.assertIn('Đầu tư', config_by_sheet['PLP']['choices']['Nhóm'])
        self.assertIn('Quy hoạch', config_by_sheet['DMD']['choices']['Hạng mục'])
        self.assertIn('Hạ tầng kỹ thuật', config_by_sheet['PCD']['choices']['Mục'])
        self.assertTrue(all(item['repeatable'] for item in config))
        for sheet_name in ('IDD', 'PLP', 'DMD', 'PCD'):
            self.assertTrue(config_by_sheet[sheet_name]['dynamic_item_field'])
            self.assertTrue(config_by_sheet[sheet_name]['dynamic_content_field'])
        self.assertIn('Nội dung', config_by_sheet['IDD']['headers'])
        self.assertIn('Nội dung', config_by_sheet['DMD']['headers'])
        self.assertIn('Nội dung', config_by_sheet['PCD']['headers'])

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

        dynamic_entry_ids = []
        for content in ('Thiết kế ý tưởng', 'Thiết kế cơ sở'):
            dynamic_created = self.client.post('/api/masterdata/entries', json={
                'project_code': project_code,
                'source_sheet': 'DMD',
                'values': {
                    'Hạng mục': 'Quy hoạch',
                    'Nội dung': content,
                    'Hiện trạng hồ sơ': 'Đang thực hiện'
                }
            })
            self.assertEqual(
                dynamic_created.status_code, 200,
                dynamic_created.get_data(as_text=True)
            )
            dynamic_entry_ids.append(dynamic_created.get_json()['id'])

        dynamic_entries = self.client.get(
            f'/api/masterdata/entries?project_code={project_code}&sheet=DMD'
        ).get_json()
        self.assertEqual(len(dynamic_entries), 2)
        self.assertEqual(
            {entry['values']['Nội dung'] for entry in dynamic_entries},
            {'Thiết kế ý tưởng', 'Thiết kế cơ sở'}
        )

        dynamic_fact = self.client.get(
            f'/api/masterdata/export-fact?project_code={project_code}'
        )
        dynamic_rows = [
            row for row in csv.DictReader(StringIO(dynamic_fact.data.decode('utf-8-sig')))
            if row['source_sheet'] == 'DMD'
        ]
        self.assertEqual({row['hang_muc'] for row in dynamic_rows}, {
            'Thiết kế ý tưởng', 'Thiết kế cơ sở'
        })
        self.assertTrue(all('Quy hoạch' in row['phan_nhom'] for row in dynamic_rows))

        for dynamic_entry_id in dynamic_entry_ids:
            dynamic_deleted = self.client.delete(
                f'/api/masterdata/entries/{dynamic_entry_id}'
            )
            self.assertEqual(dynamic_deleted.status_code, 200)

        deleted = self.client.delete(f'/api/masterdata/entries/{entry_id}')
        self.assertEqual(deleted.status_code, 200)

    def test_project_overview_crud_and_export(self):
        home = self.client.get('/')
        self.assertEqual(home.status_code, 200)
        self.assertIn(b'tab-projects', home.data)
        self.assertNotIn(b"switchTab('dashboard'", home.data)
        self.assertIn(b'id="tab-project-overview" class="tab-content active"', home.data)
        self.assertIn(b'id="tab-allocations" class="tab-content"', home.data)
        self.assertNotIn(b'id="tab-allocations" class="tab-content active"', home.data)
        self.assertIn(b'id="overview-layer-2" class="overview-layer" hidden', home.data)
        self.assertIn(b'id="overview-layer-3" class="overview-layer" hidden', home.data)
        self.assertNotIn(b'class="kanban-heading"', home.data)
        self.assertNotIn("DANH MỤC DỰ ÁN".encode("utf-8"), home.data)
        self.assertNotIn(b'class="org-flow-label"', home.data)
        self.assertEqual(home.data.count(b'class="status-column '), 5)
        self.assertNotIn(b'id="list-operating"', home.data)
        self.assertNotIn(b'id="list-closed"', home.data)
        self.assertNotIn(b'id="list-other"', home.data)
        self.assertIn(b'overview-back-button overview-inline-back', home.data)
        self.assertIn('Quay về danh sách khu vực'.encode('utf-8'), home.data)
        self.assertNotIn(b'id="layer2-path-region"', home.data)
        self.assertNotIn(b'id="layer3-path-region"', home.data)
        self.assertNotIn(b'<span>5 khu v', home.data)
        self.assertIn(b'id="tab-region-config"', home.data)
        self.assertIn(b'class="grid-stats allocation-kpis"', home.data)
        self.assertIn(b'href="/api/masterdata/export-template"', home.data)
        self.assertIn('Tải workbook 16 sheet'.encode('utf-8'), home.data)
        self.assertIn(b'modal-project', home.data)
        self.assertNotIn('Nguyễn Lê Mỹ Hưng'.encode('utf-8'), home.data)
        self.assertIn(b'id="l3-department-chips"', home.data)
        self.assertNotIn(b'id="l3-department-select"', home.data)
        self.assertIn('Thông tin theo phòng ban'.encode('utf-8'), home.data)
        self.assertIn('Chọn một phòng ban để xem dữ liệu liên quan'.encode('utf-8'), home.data)
        self.assertNotIn('Mức độ hoàn thiện dữ liệu'.encode('utf-8'), home.data)
        self.assertNotIn('Không cần chuyển tab hoặc chọn lại dự án'.encode('utf-8'), home.data)
        self.assertIn(b'id="l3-details-table-head"', home.data)
        self.assertIn(b'type="text" id="project-products-input"', home.data)
        self.assertNotIn('HỒ SƠ NHẬP LIỆU TẬP TRUNG'.encode('utf-8'), home.data)
        self.assertNotIn(b'PROJECT COMMAND CENTER', home.data)
        self.assertNotIn(b'LAYER 01', home.data)
        self.assertNotIn(b'LAYER 02', home.data)
        self.assertNotIn(b'LAYER 03', home.data)
        self.assertNotIn(
            'Theo dõi cơ cấu khu vực, nhân sự điều hành'.encode('utf-8'),
            home.data
        )
        self.assertNotIn('Dữ liệu trực tiếp'.encode('utf-8'), home.data)

        region_team = self.client.get(
            '/api/overview/region-team',
            query_string={'region': 'Vùng Đồng Nai 1'}
        )
        self.assertEqual(
            region_team.status_code, 200, region_team.get_data(as_text=True)
        )
        self.assertIn('team', region_team.get_json())
        self.assertIn('headcount', region_team.get_json())
        self.assertTrue(
            all(member['ma_oc'].upper() == 'GMD'
                for member in region_team.get_json()['team'])
        )

        areas_response = self.client.get('/api/overview/areas')
        self.assertEqual(
            areas_response.status_code, 200,
            areas_response.get_data(as_text=True)
        )
        areas = areas_response.get_json()
        self.assertEqual(len(areas), 5)
        self.assertEqual(
            [area['area_code'] for area in areas],
            ['KV1', 'KV2', 'KV3', 'KV4', 'KV5']
        )
        self.assertEqual(
            sum(len(area['regions']) for area in areas),
            29
        )
        dong_nai_1 = next(
            region
            for area in areas
            for region in area['regions']
            if region['region_code'] == 'GMD.ĐN1-NVLG'
        )
        self.assertTrue(
            all(member['ma_oc'].upper() == 'GMD'
                for member in dong_nai_1['team'])
        )

        stats_before = self.client.get('/api/projects/overview-stats')
        self.assertEqual(stats_before.status_code, 200)

        payload = {
            'ma_du_an': 'TEST.CDX.001',
            'ten_du_an': 'Dự án kiểm thử Codex',
            'khu_vuc': 'TP.HCM 1',
            'hien_trang_dau_tu': 'Đang nghiên cứu',
            'nhom_du_an': 'Nhóm 1',
            'quan_ly': 'Ban điều hành test',
            'ten_phap_ly': 'Dự án pháp lý test',
            'ten_thuong_mai': 'Codex Riverside',
            'chu_dau_tu': 'NVL Test',
            'dia_diem_du_an': 'TP.HCM',
            'tong_dien_tich_ha': '12.5',
            'so_luong_san_pham': '850 căn và 12 shophouse',
            'nguon_goc_du_an': 'Tự phát triển',
            'source_stt': 'TEST-001',
            'tong_cong_ty': 'NVLG',
            'tinh_cu': 'TP.HCM',
            'tinh_moi': 'Thành phố Hồ Chí Minh',
            'loai_hinh': 'Khu đô thị (IND)',
            'muc_do_uu_tien': '1'
        }
        created = self.client.post('/api/projects', json=payload)
        self.assertEqual(created.status_code, 200, created.get_data(as_text=True))
        created_project_id = created.get_json()['id']
        self.assertIsInstance(created_project_id, int)

        project = self.client.get('/api/projects/TEST.CDX.001')
        self.assertEqual(project.status_code, 200)
        self.assertEqual(project.get_json()['id'], created_project_id)
        self.assertEqual(project.get_json()['ten_thuong_mai'], 'Codex Riverside')
        self.assertEqual(project.get_json()['hien_trang_dau_tu'], 'Đang nghiên cứu')
        self.assertEqual(project.get_json()['nhom_du_an'], 'Nhóm 1')
        self.assertEqual(project.get_json()['tong_cong_ty'], 'NVLG')
        self.assertEqual(
            project.get_json()['so_luong_san_pham'],
            '850 căn và 12 shophouse'
        )

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
