# Contract Detail Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển Nội dung gói thầu và Ngày ký HĐ từ Rows sang Values của matrix Công nợ, chỉ hiển thị tại cấp Số hợp đồng gốc bằng `ISINSCOPE`.

**Architecture:** Thêm hai measure hiển thị dạng text vào semantic model. Generator PBIR đặt năm trường định danh trong Rows và đặt hai measure mới ở đầu Values; verifier kiểm tra đồng thời cấu trúc visual và nội dung DAX để ngăn hồi quy.

**Tech Stack:** Power BI PBIP/PBIR, TMDL, DAX, Node.js ESM, `powerbi-report-author`, `powerbi-desktop`.

## Global Constraints

- `SỐ HỢP ĐỒNG GỐC` là nhãn hiển thị của `Data[SỐ HỢP ĐỒNG CHÍNH]`.
- Matrix giữ đúng 23 cột A–W.
- Rows kết thúc tại Số hợp đồng gốc; Nội dung gói thầu và Ngày ký HĐ phải nằm trong Values.
- Hai measure mới phải dùng `ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] )` và trả `BLANK()` ngoài scope hợp đồng.
- Không thay đổi KPI, biểu đồ, slicer, nguồn dữ liệu hoặc các công thức công nợ (1)–(12).
- Không ghi PBIR/TMDL khi Power BI Desktop còn mở bản PBIP cũ trong bộ nhớ.

---

### Task 1: Khóa hành vi mong muốn bằng verifier

**Files:**
- Modify: `_tools/verify-cong-no-template.mjs`
- Test: `_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: PBIR matrix `c3000000000000000014` và `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`.
- Produces: kiểm tra hồi quy cho năm Rows, 18 Values và hai measure có `ISINSCOPE`.

- [ ] **Step 1: Cập nhật kỳ vọng Rows và Values**

Đặt `expectedRows` thành đúng năm property:

```js
[
  'NT/NCC/TV ',
  'Khu vực chuẩn',
  'TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ',
  'PHÁP NHÂN KÝ HĐ/PLHĐ',
  'SỐ HỢP ĐỒNG CHÍNH',
]
```

Thêm hai property sau vào đầu `expectedValues`:

```js
'Nội dung gói thầu (dòng)',
'Ngày ký HĐ (dòng)',
```

Thêm hai nhãn tương ứng vào đầu `expectedValueLabels`:

```js
'NỘI DUNG GÓI THẦU',
'NGÀY KÝ HĐ',
```

- [ ] **Step 2: Kiểm tra DAX trong TMDL**

Đọc `Data.tmdl`, tách block của từng measure và báo lỗi nếu thiếu các đoạn sau:

```js
const expectedDisplayMeasures = [
  { name: 'Nội dung gói thầu (dòng)', source: 'Data[NỘI DUNG HỢP ĐỒNG]' },
  { name: 'Ngày ký HĐ (dòng)', source: 'Data[NGÀY KÝ HĐ]' },
];
```

Mỗi block phải chứa cả:

```text
ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] )
SELECTEDVALUE ( <source> )
```

- [ ] **Step 3: Chạy verifier để xác nhận RED**

Run: `node .\_tools\verify-cong-no-template.mjs`

Expected: FAIL vì visual hiện có bảy Rows, thiếu hai Values mới và TMDL chưa có hai measure mới.

---

### Task 2: Thêm hai measure hiển thị theo scope hợp đồng

**Files:**
- Modify: `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`
- Test: `_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: `Data[SỐ HỢP ĐỒNG CHÍNH]`, `Data[NỘI DUNG HỢP ĐỒNG]`, `Data[NGÀY KÝ HĐ]`.
- Produces: `[Nội dung gói thầu (dòng)]` và `[Ngày ký HĐ (dòng)]` cho matrix.

- [ ] **Step 1: Thêm measure Nội dung gói thầu**

```DAX
measure 'Nội dung gói thầu (dòng)' =
        IF (
            ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),
            SELECTEDVALUE ( Data[NỘI DUNG HỢP ĐỒNG] )
        )
    displayFolder: Công nợ\04. Hiển thị bảng
```

- [ ] **Step 2: Thêm measure Ngày ký HĐ**

```DAX
measure 'Ngày ký HĐ (dòng)' =
        IF (
            ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),
            SELECTEDVALUE ( Data[NGÀY KÝ HĐ] )
        )
    displayFolder: Công nợ\04. Hiển thị bảng
```

- [ ] **Step 3: Kiểm tra cú pháp model offline**

Kết nối Modeling MCP tới thư mục `DASHBOARD TQT.SemanticModel/definition`, load model và xác nhận cả hai measure ở trạng thái Ready.

---

### Task 3: Chuyển hai cột từ Rows sang Values

**Files:**
- Modify: `_tools/build-cong-no-page.mjs`
- Generated: `DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/visuals/c3000000000000000014/visual.json`
- Test: `_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: hai measure do Task 2 tạo.
- Produces: matrix có năm Rows và 18 Values, tổng cộng 23 cột A–W.

- [ ] **Step 1: Xóa hai column projection khỏi Rows**

Xóa:

```js
column("NỘI DUNG HỢP ĐỒNG", "NỘI DUNG GÓI THẦU"),
column("NGÀY KÝ HĐ", "NGÀY KÝ HĐ"),
```

- [ ] **Step 2: Thêm hai measure projection vào đầu Values**

```js
measure("Nội dung gói thầu (dòng)", "NỘI DUNG GÓI THẦU"),
measure("Ngày ký HĐ (dòng)", "NGÀY KÝ HĐ"),
```

- [ ] **Step 3: Sinh lại page và xác nhận GREEN**

Run: `node .\_tools\build-cong-no-page.mjs`

Expected: generator báo trang có 23 visual.

Run: `node .\_tools\verify-cong-no-template.mjs`

Expected: PASS với năm Rows, 18 Values, đủ 23 cột và hai measure có đúng `ISINSCOPE`.

---

### Task 4: Validate model và báo cáo

**Files:**
- Verify: `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`
- Verify: `DASHBOARD TQT.Report`

**Interfaces:**
- Consumes: model và PBIR sau Task 2–3.
- Produces: bằng chứng model sẵn sàng và PBIR hợp lệ.

- [ ] **Step 1: Validate PBIR**

Run: `powerbi-report-author validate ".\DASHBOARD TQT.Report" --no-schema --format text`

Expected: `0 error(s), 0 warning(s); result=succeeded`.

- [ ] **Step 2: Kiểm tra số lượng visual**

Run `powerbi-report-author preview-visuals` và xác nhận trang Công nợ vẫn có 23 visual: 6 slicer, 5 card, 2 bar chart, 1 pivotTable, 8 textbox, 1 shape.

- [ ] **Step 3: Kiểm tra DAX theo scope**

Mở PBIP mới từ file trên đĩa, kết nối Modeling MCP tới instance và chạy DAX có `ROLLUPADDISSUBTOTAL` để xác nhận hai measure trống tại subtotal và có giá trị tại cấp `Data[SỐ HỢP ĐỒNG CHÍNH]`.

---

### Task 5: Review Power BI Desktop

**Files:**
- Create: `_artifacts/debt-template-review/Công nợ-contract-values.png`

**Interfaces:**
- Consumes: PBIP đã validate và model đã load lại từ đĩa.
- Produces: ảnh nghiệm thu trực quan của trang Công nợ.

- [ ] **Step 1: Chụp đúng page**

Run: `powerbi-desktop screenshot c031b9f45a2e4d7b81f0 --pid <pid> --output ".\_artifacts\debt-template-review\Công nợ-contract-values.png"`

- [ ] **Step 2: Kiểm tra ảnh**

Xác nhận matrix không còn hai cấp hierarchy Nội dung/Ngày ký, vẫn có dải nhóm màu, KPI, biểu đồ và slicer; không có visual error hoặc overlap mới.

- [ ] **Step 3: Chạy lại bộ kiểm tra cuối**

Run lại verifier và PBIR validator sau ảnh chụp. Chỉ báo hoàn tất khi cả hai lệnh vẫn PASS.
