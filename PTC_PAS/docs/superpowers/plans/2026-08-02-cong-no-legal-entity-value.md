# Pháp nhân theo cấp Hợp đồng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển Pháp nhân khỏi Rows sang Values của matrix Công nợ và chỉ hiển thị tại cấp Số Hợp đồng Gốc bằng `ISINSCOPE`.

**Architecture:** Thêm một measure text ở semantic model theo đúng mẫu của Nội dung và Ngày ký, rồi bind measure đó vào đầu Values của matrix. Cập nhật script build và verifier làm nguồn chuẩn để lần sinh lại trang không hoàn tác thay đổi; sau đó validate PBIR và kiểm tra render trong Power BI Desktop.

**Tech Stack:** Power BI PBIP/PBIR, TMDL, DAX, Node.js verifier/builder, `powerbi-report-author`, `powerbi-desktop`.

## Global Constraints

- Rows sau thay đổi phải đúng bốn cấp: `NT/NCC/TV `, `Khu vực chuẩn`, `TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ`, `SỐ HỢP ĐỒNG CHÍNH`.
- Values phải có 19 measure; `Pháp nhân ký HĐ (dòng)` đứng trước `Nội dung gói thầu (dòng)` và `Ngày ký HĐ (dòng)`.
- Measure Pháp nhân dùng `ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] )` và `SELECTEDVALUE ( Data[PHÁP NHÂN KÝ HĐ/PLHĐ] )`.
- Giữ nguyên slicer Pháp nhân, KPI, biểu đồ, các chỉ tiêu công nợ và ba dải màu nhóm.
- Dữ liệu đang nạp có 6.616 Số HĐ Gốc: 6.603 có đúng một Pháp nhân, 13 thiếu Pháp nhân và 0 có nhiều Pháp nhân.
- Không reload Power BI Desktop khi `hasUnsavedChanges: true`; người dùng phải Save và đóng Desktop trước khi ghi PBIP.

---

### Task 1: Khóa yêu cầu bằng verifier thất bại

**Files:**
- Modify: `PTC_PAS/_tools/verify-cong-no-template.mjs`
- Test: `PTC_PAS/_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: matrix `c3000000000000000014` và `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`.
- Produces: kiểm tra hồi quy cho 4 Rows, 19 Values, nhãn `PHÁP NHÂN KÝ HĐ` và measure DAX đúng scope.

- [ ] **Step 1: Cập nhật kỳ vọng Rows và Values**

Xóa `PHÁP NHÂN KÝ HĐ/PLHĐ` khỏi `expectedRows`. Thêm vào đầu `expectedValues` và `expectedValueLabels`:

```js
'Pháp nhân ký HĐ (dòng)',
```

```js
'PHÁP NHÂN KÝ HĐ',
```

- [ ] **Step 2: Thêm kiểm tra measure TMDL**

Khai báo đường dẫn model và kiểm tra block measure chứa cả hai biểu thức:

```js
const modelPath = path.join(
  projectRoot,
  'DASHBOARD TQT.SemanticModel',
  'definition',
  'tables',
  'Data.tmdl',
);

const modelTmdl = fs.readFileSync(modelPath, 'utf8');
const legalEntityMeasure = modelTmdl.match(
  /measure 'Pháp nhân ký HĐ \(dòng\)' =[\s\S]*?(?=\n\t(?:measure|column|partition) )/,
)?.[0] ?? '';

if (!legalEntityMeasure.includes('ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] )')) {
  failures.push('Measure Pháp nhân phải dùng ISINSCOPE tại Số Hợp đồng Gốc.');
}
if (!legalEntityMeasure.includes('SELECTEDVALUE ( Data[PHÁP NHÂN KÝ HĐ/PLHĐ] )')) {
  failures.push('Measure Pháp nhân phải lấy đúng cột nguồn bằng SELECTEDVALUE.');
}
```

Đổi thông báo PASS thành `4 Rows, 19 Values, đủ 23 cột`.

- [ ] **Step 3: Chạy verifier để xác nhận RED**

Run:

```powershell
node PTC_PAS/_tools/verify-cong-no-template.mjs
```

Expected: FAIL vì matrix còn 5 Rows/18 Values và measure `Pháp nhân ký HĐ (dòng)` chưa tồn tại.

---

### Task 2: Thêm measure Pháp nhân vào semantic model bằng Modeling MCP

**Files:**
- Modify: `PTC_PAS/DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`
- Test: `PTC_PAS/_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: `Data[SỐ HỢP ĐỒNG CHÍNH]` và `Data[PHÁP NHÂN KÝ HĐ/PLHĐ]`.
- Produces: measure text `[Pháp nhân ký HĐ (dòng)]` cho matrix.

- [ ] **Step 1: Kết nối MCP với thư mục semantic model**

Gọi `connection_operations` với:

```json
{
  "request": {
    "operation": "ConnectFolder",
    "folderPath": "C:/Users/Admin/Desktop/PowerBI Visualize/PTC_PAS/DASHBOARD TQT.SemanticModel/definition"
  }
}
```

- [ ] **Step 2: Tạo measure theo mẫu hợp đồng hiện tại**

Gọi `measure_operations` với một definition có nội dung tương đương:

```json
{
  "name": "Pháp nhân ký HĐ (dòng)",
  "tableName": "Data",
  "expression": "IF (\n    ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),\n    SELECTEDVALUE ( Data[PHÁP NHÂN KÝ HĐ/PLHĐ] )\n)",
  "formatString": "@",
  "displayFolder": "Công nợ\\04. Hiển thị bảng",
  "description": "Hiển thị Pháp nhân ký HĐ trong matrix Công nợ chỉ tại cấp Số hợp đồng gốc; để trống tại subtotal và grand total.",
  "lineageTag": "1b419953-9dd5-47cd-9f4a-3153ee945793"
}
```

- [ ] **Step 3: Export model về đúng thư mục TMDL**

Gọi `database_operations` với `operation: ExportToTmdlFolder`, connection vừa tạo và đích:

```text
C:/Users/Admin/Desktop/PowerBI Visualize/PTC_PAS/DASHBOARD TQT.SemanticModel/definition
```

- [ ] **Step 4: Chạy verifier để xác nhận lỗi measure đã hết**

Run:

```powershell
node PTC_PAS/_tools/verify-cong-no-template.mjs
```

Expected: vẫn FAIL do matrix chưa đổi Rows/Values, nhưng không còn lỗi thiếu `ISINSCOPE` hoặc `SELECTEDVALUE` của measure Pháp nhân.

---

### Task 3: Chuyển Pháp nhân từ Rows sang Values

**Files:**
- Modify: `PTC_PAS/_tools/build-cong-no-page.mjs`
- Regenerate: `PTC_PAS/DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/visuals/c3000000000000000014/visual.json`
- Test: `PTC_PAS/_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: measure `[Pháp nhân ký HĐ (dòng)]` từ Task 2.
- Produces: matrix 4 Rows, 19 Values, 23 cột hiển thị đúng thứ tự.

- [ ] **Step 1: Cập nhật cấu hình matrix trong builder**

Xóa projection này khỏi Rows:

```js
column('PHÁP NHÂN KÝ HĐ/PLHĐ', 'PHÁP NHÂN KÝ HĐ'),
```

Thêm projection này vào đầu Values:

```js
measure('Pháp nhân ký HĐ (dòng)', 'PHÁP NHÂN KÝ HĐ'),
```

- [ ] **Step 2: Sinh lại trang Công nợ**

Run:

```powershell
node PTC_PAS/_tools/build-cong-no-page.mjs
```

Expected: script báo đã build trang `c031b9f45a2e4d7b81f0` và giữ nguyên 23 cột hiển thị.

- [ ] **Step 3: Chạy verifier để xác nhận GREEN**

Run:

```powershell
node PTC_PAS/_tools/verify-cong-no-template.mjs
```

Expected: PASS với 4 Rows, 19 Values, đủ 23 cột, tabular layout, ba dải màu và measure Pháp nhân đúng DAX.

---

### Task 4: Validate PBIR và kiểm tra Desktop

**Files:**
- Validate: `PTC_PAS/DASHBOARD TQT.Report`
- Inspect: trang `c031b9f45a2e4d7b81f0` trong `DASHBOARD TQT.pbip`.

**Interfaces:**
- Consumes: PBIP đã cập nhật từ Tasks 1–3.
- Produces: bằng chứng validate và screenshot xác nhận trang Công nợ render đúng.

- [ ] **Step 1: Validate report definition**

Run:

```powershell
powerbi-report-author validate "PTC_PAS/DASHBOARD TQT.Report"
```

Expected: 0 errors và 0 warnings.

- [ ] **Step 2: Mở hoặc reload PBIP sau khi Desktop đã sạch**

Nếu Desktop đã đóng:

```powershell
powerbi-desktop open "PTC_PAS/DASHBOARD TQT.pbip"
```

Nếu Desktop vẫn mở và `hasUnsavedChanges: false`:

```powershell
$pbiPid = Get-Process -Name PBIDesktop | Select-Object -First 1 -ExpandProperty Id
powerbi-desktop reload --pid $pbiPid
```

Expected: bridge trả trạng thái ready với đúng report và ba trang.

- [ ] **Step 3: Chụp trang Công nợ**

Run:

```powershell
$pbiPid = Get-Process -Name PBIDesktop | Select-Object -First 1 -ExpandProperty Id
powerbi-desktop screenshot c031b9f45a2e4d7b81f0 --pid $pbiPid --output "PTC_PAS/_artifacts/debt-template-review/Công nợ-legal-entity-value.png"
```

Expected: ảnh cho thấy Pháp nhân là Value đứng trước Nội dung và Ngày ký; hierarchy Rows kết thúc tại Số Hợp đồng Gốc; không có lỗi visual hoặc chồng lấn mới.

- [ ] **Step 4: Kiểm tra trạng thái Git và commit implementation**

Run:

```powershell
git diff --check
git status --short
```

Expected: chỉ có các file đúng phạm vi và ảnh kiểm tra mới.

Commit:

```powershell
git add -- "PTC_PAS/DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl" "PTC_PAS/DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/visuals/c3000000000000000014/visual.json" "PTC_PAS/_tools/build-cong-no-page.mjs" "PTC_PAS/_tools/verify-cong-no-template.mjs" "PTC_PAS/_artifacts/debt-template-review/Công nợ-legal-entity-value.png"
git commit -m "Show legal entity at contract value level"
```
