import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const pageRoot = path.join(
  projectRoot,
  'DASHBOARD TQT.Report',
  'definition',
  'pages',
  'c031b9f45a2e4d7b81f0',
);
const matrixId = 'c3000000000000000014';
const matrixPath = path.join(pageRoot, 'visuals', matrixId, 'visual.json');
const pagePath = path.join(pageRoot, 'page.json');

const expectedRows = [
  'NT/NCC/TV ',
  'Khu vực chuẩn',
  'TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ',
  'PHÁP NHÂN KÝ HĐ/PLHĐ',
  'SỐ HỢP ĐỒNG CHÍNH',
];

const expectedValues = [
  'Nội dung gói thầu (dòng)',
  'Ngày ký HĐ (dòng)',
  'Giá trị HĐ + PS gồm VAT',
  'Giá trị hóa đơn chưa VAT',
  'Giá trị hóa đơn gồm VAT',
  'Giá trị tạm ứng',
  '(3) Khấu trừ tạm ứng',
  '(4) Tạm ứng chưa thu hồi',
  '(5) Công nợ đã có CPC',
  '(6) Đã thanh toán',
  '(7) Giá trị Swap',
  '(8) Công nợ CPC còn lại',
  '(9) Công nợ sau trừ tạm ứng',
  '(10) Tổng nợ phải trả',
  '(11) Tiền bảo hành giữ lại',
  '(12) Tổng còn lại phải trả',
  'Tình trạng HĐ (dòng)',
  'Tình trạng quyết toán (dòng)',
];

const expectedValueLabels = [
  'NỘI DUNG GÓI THẦU',
  'NGÀY KÝ HĐ',
  'GIÁ TRỊ HĐ+PS GỒM VAT',
  'GIÁ TRỊ HÓA ĐƠN (CHƯA GỒM VAT)',
  '(1) GIÁ TRỊ HÓA ĐƠN (GỒM VAT)',
  '(2) GIÁ TRỊ TẠM ỨNG',
  '(3) KHẤU TRỪ TẠM ỨNG',
  '(4)=(2)-(3) TẠM ỨNG CHƯA THU HỒI',
  '(5) CÔNG NỢ ĐÃ CÓ CPC GỒM TẠM ỨNG + WD',
  '(6) ĐÃ THANH TOÁN GỒM ỨNG + WD',
  '(7) GIÁ TRỊ SWAP',
  '(8)=(5)-(6)-(7) CPC CÒN LẠI',
  '(9)=(8)-(4) SAU TRỪ TẠM ỨNG',
  '(10)=(1)-(6)-(7) TỔNG NỢ PHẢI TRẢ',
  '(11) TIỀN BẢO HÀNH GIỮ LẠI',
  '(12)=(10)-(11) CÒN LẠI PHẢI TRẢ',
  'Tình trạng HĐ',
  'TÌNH TRẠNG QUYẾT TOÁN',
];

const expectedGroupBands = [
  { id: 'c3000000000000000015', label: 'THEO DÕI TẠM ỨNG • (2)–(4)', color: '#FFFF00' },
  { id: 'c3000000000000000016', label: 'CÔNG NỢ THEO CPC • (5)–(9)', color: '#9BC2E6' },
  { id: 'c3000000000000000017', label: 'CÔNG NỢ THEO HÓA ĐƠN • (10)–(12)', color: '#A9D18E' },
];

function projectionProperty(projection) {
  return projection?.field?.Column?.Property ?? projection?.field?.Measure?.Property;
}

function sameArray(actual, expected) {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

const failures = [];
if (!fs.existsSync(matrixPath)) {
  failures.push(`Không tìm thấy visual chi tiết: ${matrixPath}`);
} else {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const page = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
  const queryState = matrix?.visual?.query?.queryState ?? {};
  const actualRows = (queryState.Rows?.projections ?? []).map(projectionProperty);
  const actualValues = (queryState.Values?.projections ?? []).map(projectionProperty);
  const actualValueLabels = (queryState.Values?.projections ?? []).map((projection) => projection.displayName);
  const stepped = matrix?.visual?.objects?.rowHeaders?.[0]?.properties?.stepped?.expr?.Literal?.Value;

  if (matrix?.visual?.visualType !== 'pivotTable') {
    failures.push(`Visual ${matrixId} phải là pivotTable.`);
  }
  if (!sameArray(actualRows, expectedRows)) {
    failures.push(`Rows chưa đúng thứ tự template.\n  actual: ${JSON.stringify(actualRows)}\n  expect: ${JSON.stringify(expectedRows)}`);
  }
  if (!sameArray(actualValues, expectedValues)) {
    failures.push(`Values chưa đúng thứ tự template.\n  actual: ${JSON.stringify(actualValues)}\n  expect: ${JSON.stringify(expectedValues)}`);
  }
  if (!sameArray(actualValueLabels, expectedValueLabels)) {
    failures.push(`Nhãn Values chưa đúng công thức template.\n  actual: ${JSON.stringify(actualValueLabels)}\n  expect: ${JSON.stringify(expectedValueLabels)}`);
  }
  if (stepped !== 'false') {
    failures.push(`Row headers phải ở dạng tabular (stepped=false), hiện tại: ${String(stepped)}`);
  }
  if (page.width !== 1920 || page.height !== 1080) {
    failures.push(`Canvas phải là 1920x1080, hiện tại ${page.width}x${page.height}.`);
  }
  const { x, y, width, height } = matrix.position;
  if (x < 0 || y < 0 || x + width > page.width || y + height > page.height) {
    failures.push('Matrix nằm ngoài canvas trang.');
  }
}

for (const band of expectedGroupBands) {
  const visualPath = path.join(pageRoot, 'visuals', band.id, 'visual.json');
  if (!fs.existsSync(visualPath)) {
    failures.push(`Thiếu dải màu nhóm: ${band.id}`);
    continue;
  }
  const visual = JSON.parse(fs.readFileSync(visualPath, 'utf8'));
  const label = visual?.visual?.objects?.general?.[0]?.properties?.paragraphs?.[0]?.textRuns?.[0]?.value;
  const color = visual?.visual?.visualContainerObjects?.background?.[0]?.properties?.color?.solid?.color?.expr?.Literal?.Value;
  if (label !== band.label) failures.push(`Dải ${band.id} sai nhãn: ${String(label)}`);
  if (color !== `'${band.color}'`) failures.push(`Dải ${band.id} sai màu: ${String(color)}`);
  if (visual.position.y !== 568 || visual.position.height !== 40) {
    failures.push(`Dải ${band.id} sai vị trí hoặc chiều cao.`);
  }
}

if (failures.length > 0) {
  console.error(`FAIL: Trang Công nợ chưa khớp template (${failures.length} lỗi).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS: Bảng Công nợ có 5 Rows, 18 Values, đủ 23 cột đúng thứ tự, tabular layout và 3 dải màu nhóm.');
