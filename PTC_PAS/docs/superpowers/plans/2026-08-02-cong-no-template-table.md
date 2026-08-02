# Công nợ Template Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `Công nợ` page detail matrix so it follows all 23 template columns A–W, preserves the existing KPI/chart/filter layout, and supports hierarchy drill, totals, status columns, and template-aligned group colors.

**Architecture:** Keep the existing deterministic Node.js page generator as the single PBIR source of truth. Add two model measures for row-level status text, then expand the matrix from four row fields and six values to seven row fields and sixteen values; add a compact colored group-key band above the matrix. A static Node.js verifier checks bindings, ordering, labels, format settings, and page bounds before Desktop rendering.

**Tech Stack:** PBIP/PBIR JSON, TMDL, DAX, Node.js, `powerbi-report-author` 0.1.4, `powerbi-desktop` 0.1.2, Power BI Modeling MCP.

## Global Constraints

- Source design: `docs/superpowers/specs/2026-08-02-cong-no-template-table-design.md`.
- Target project: `DASHBOARD TQT.pbip`; target page id: `c031b9f45a2e4d7b81f0`.
- Preserve the existing 1920×1080 canvas, six slicers, five KPI cards, and two ranking charts.
- The matrix must expose exactly 23 columns A–W in the approved order.
- Monetary values use `#,##0;[Red]-#,##0;-`; negative values retain a minus sign and red text.
- `te` CLI is not installed. Use Power BI Modeling MCP for live DAX validation, then persist the validated measure definitions into `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl`.
- This directory is not a Git repository. Do not include commit operations; create a timestamped reversible snapshot before the generator rewrites the page.
- Do not reload a Desktop instance when `hasUnsavedChanges` is `true`.
- Completion requires `powerbi-report-author validate` with 0 errors/0 warnings plus a clean Desktop screenshot review.

---

### Task 1: Add a failing structural contract test

**Files:**
- Create: `_tools/verify-cong-no-template.mjs`
- Read: `DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/visuals/c3000000000000000014/visual.json`
- Read: `DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/page.json`

**Interfaces:**
- Consumes: the generated `pivotTable` visual JSON.
- Produces: process exit code 0 only when row/value bindings and visual layout meet the template contract.

- [ ] **Step 1: Create the verifier with exact ordered contracts**

```js
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS";
const pageRoot = path.join(root, "DASHBOARD TQT.Report", "definition", "pages", "c031b9f45a2e4d7b81f0");
const visualPath = path.join(pageRoot, "visuals", "c3000000000000000014", "visual.json");
const visual = JSON.parse(fs.readFileSync(visualPath, "utf8"));
const page = JSON.parse(fs.readFileSync(path.join(pageRoot, "page.json"), "utf8"));

const expectedRows = [
  "NT/NCC/TV ",
  "Khu vực chuẩn",
  "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ",
  "PHÁP NHÂN KÝ HĐ/PLHĐ",
  "SỐ HỢP ĐỒNG CHÍNH",
  "NỘI DUNG HỢP ĐỒNG",
  "NGÀY KÝ HĐ",
];

const expectedValues = [
  "Giá trị HĐ + PS gồm VAT",
  "Giá trị hóa đơn chưa VAT",
  "Giá trị hóa đơn gồm VAT",
  "Giá trị tạm ứng",
  "(3) Khấu trừ tạm ứng",
  "(4) Tạm ứng chưa thu hồi",
  "(5) Công nợ đã có CPC",
  "(6) Đã thanh toán",
  "(7) Giá trị Swap",
  "(8) Công nợ CPC còn lại",
  "(9) Công nợ sau trừ tạm ứng",
  "(10) Tổng nợ phải trả",
  "(11) Tiền bảo hành giữ lại",
  "(12) Tổng còn lại phải trả",
  "Tình trạng HĐ (dòng)",
  "Tình trạng quyết toán (dòng)",
];

const properties = (role, kind) =>
  visual.visual.query.queryState[role].projections.map((projection) => projection.field[kind].Property);

assert.equal(visual.visual.visualType, "pivotTable");
assert.deepEqual(properties("Rows", "Column"), expectedRows);
assert.deepEqual(properties("Values", "Measure"), expectedValues);
assert.equal(expectedRows.length + expectedValues.length, 23);
assert.equal(page.width, 1920);
assert.equal(page.height, 1080);
assert.ok(visual.position.x >= 0 && visual.position.y >= 0);
assert.ok(visual.position.x + visual.position.width <= page.width);
assert.ok(visual.position.y + visual.position.height <= page.height);

const serialized = JSON.stringify(visual);
for (const label of [
  "(1) GIÁ TRỊ HÓA ĐƠN (GỒM VAT)",
  "(4)=(2)-(3) TẠM ỨNG CHƯA THU HỒI",
  "(8)=(5)-(6)-(7) CPC CÒN LẠI",
  "(9)=(8)-(4) SAU TRỪ TẠM ỨNG",
  "(10)=(1)-(6)-(7) TỔNG NỢ PHẢI TRẢ",
  "(12)=(10)-(11) CÒN LẠI PHẢI TRẢ",
]) assert.ok(serialized.includes(label), `Missing display label: ${label}`);

console.log("Công nợ template contract passed: 7 row fields + 16 value fields = 23 columns.");
```

- [ ] **Step 2: Run the verifier and confirm the current matrix fails**

Run:

```powershell
node _tools\verify-cong-no-template.mjs
```

Expected: FAIL at `assert.deepEqual(properties("Rows", "Column"), expectedRows)` because the current matrix has four row fields in a different order.

- [ ] **Step 3: Create a reversible pre-change snapshot**

Run:

```powershell
$snapshot = '_backups\2026-08-02-before-cong-no-template'
New-Item -ItemType Directory -Force -Path $snapshot | Out-Null
Copy-Item -LiteralPath '_tools\build-cong-no-page.mjs' -Destination $snapshot
Copy-Item -LiteralPath 'DASHBOARD TQT.SemanticModel\definition\tables\Data.tmdl' -Destination $snapshot
Copy-Item -LiteralPath 'DASHBOARD TQT.Report\definition\pages\c031b9f45a2e4d7b81f0' -Destination $snapshot -Recurse
```

Expected: the snapshot contains the generator, `Data.tmdl`, `page.json`, and all existing page visual JSON files.

---

### Task 2: Add and validate the two status measures

**Files:**
- Modify: `DASHBOARD TQT.SemanticModel/definition/tables/Data.tmdl` near the existing `Công nợ` measure block.

**Interfaces:**
- Consumes: `Data[TÌNH TRẠNG THỰC HIỆN HĐ]` and `Data[Tình trạng quyết toán (chuẩn)]`.
- Produces: `Data[Tình trạng HĐ (dòng)]` and `Data[Tình trạng quyết toán (dòng)]`, both text measures usable in matrix `Values`.

- [ ] **Step 1: Open the PBIP and connect Modeling MCP**

Run:

```powershell
powerbi-desktop open "C:\Users\Admin\Desktop\PowerBI Visualize\PTC_PAS\DASHBOARD TQT.pbip"
powerbi-desktop status
```

Use Modeling MCP `connection_operations` with `ListLocalInstances`, select the instance whose file is `DASHBOARD TQT.pbip`, then call `Connect` with that instance's connection string.

- [ ] **Step 2: Validate that the new measure names do not yet resolve**

Use Modeling MCP `dax_query_operations` with operation `Validate`:

```DAX
EVALUATE
ROW (
    "Tình trạng HĐ", [Tình trạng HĐ (dòng)],
    "Tình trạng quyết toán", [Tình trạng quyết toán (dòng)]
)
```

Expected: validation failure because both measures are not defined.

- [ ] **Step 3: Create both measures in one transaction**

Use Modeling MCP `measure_operations` with operation `Create`, `UseTransaction: true`, and these definitions:

```json
[
  {
    "tableName": "Data",
    "name": "Tình trạng HĐ (dòng)",
    "expression": "SELECTEDVALUE ( Data[TÌNH TRẠNG THỰC HIỆN HĐ] )",
    "displayFolder": "Công nợ\\04. Hiển thị bảng",
    "description": "Trạng thái thực hiện hợp đồng tại ngữ cảnh một dòng; để trống khi ngữ cảnh có nhiều trạng thái."
  },
  {
    "tableName": "Data",
    "name": "Tình trạng quyết toán (dòng)",
    "expression": "SELECTEDVALUE ( Data[Tình trạng quyết toán (chuẩn)] )",
    "displayFolder": "Công nợ\\04. Hiển thị bảng",
    "description": "Trạng thái quyết toán tại ngữ cảnh một dòng; để trống khi ngữ cảnh có nhiều trạng thái."
  }
]
```

Expected: both definitions are created without DAX errors.

- [ ] **Step 4: Apply the template monetary format to the 14 matrix measures**

Use Modeling MCP `measure_operations` with operation `Update`, `UseTransaction: true`. Send one definition per measure with `tableName: "Data"`, the exact `name` below, and `formatString: "#,##0;[Red]-#,##0;-"`:

```json
[
  { "tableName": "Data", "name": "Giá trị HĐ + PS gồm VAT", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "Giá trị hóa đơn chưa VAT", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "Giá trị hóa đơn gồm VAT", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "Giá trị tạm ứng", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(3) Khấu trừ tạm ứng", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(4) Tạm ứng chưa thu hồi", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(5) Công nợ đã có CPC", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(6) Đã thanh toán", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(7) Giá trị Swap", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(8) Công nợ CPC còn lại", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(9) Công nợ sau trừ tạm ứng", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(10) Tổng nợ phải trả", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(11) Tiền bảo hành giữ lại", "formatString": "#,##0;[Red]-#,##0;-" },
  { "tableName": "Data", "name": "(12) Tổng còn lại phải trả", "formatString": "#,##0;[Red]-#,##0;-" }
]
```

Expected: all 14 updates succeed; existing DAX expressions and display folders remain unchanged.

- [ ] **Step 5: Run a leaf-grain DAX query**

Use Modeling MCP `dax_query_operations` with operation `Execute`, result mode `Inline`, and maximum 20 rows:

```DAX
EVALUATE
TOPN (
    20,
    SUMMARIZECOLUMNS (
        Data[NT/NCC/TV ],
        Data[Khu vực chuẩn],
        Data[TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ],
        Data[SỐ HỢP ĐỒNG CHÍNH],
        "Tình trạng HĐ", [Tình trạng HĐ (dòng)],
        "Tình trạng quyết toán", [Tình trạng quyết toán (dòng)]
    ),
    Data[SỐ HỢP ĐỒNG CHÍNH], ASC
)
```

Expected: rows contain contract ids and readable status text; no DAX error.

- [ ] **Step 6: Persist the validated definitions and format strings to TMDL**

Call Modeling MCP `measure_operations` with operation `ExportTMDL` for the two new measures and the 14 formatted matrix measures. Copy the two returned canonical measure definitions into `Data.tmdl` immediately after the `(12) Tổng còn lại phải trả` measure block, and update only the `formatString` lines of the 14 existing measures. Preserve UTF-8 encoding and all existing lineage tags.

- [ ] **Step 7: Reopen the PBIP and rerun the leaf-grain query**

Close only the target Desktop instance after confirming it has no unsaved report edits, reopen `DASHBOARD TQT.pbip`, reconnect Modeling MCP, and rerun Step 5.

Expected: the two measures still resolve after reopening, proving they were persisted to the PBIP model files.

---

### Task 3: Rebuild the matrix and template group header band

**Files:**
- Modify: `_tools/build-cong-no-page.mjs` in `palette`, helper functions, `matrix()`, and the `visuals` array.
- Regenerate: `DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/page.json`
- Regenerate: `DASHBOARD TQT.Report/definition/pages/c031b9f45a2e4d7b81f0/visuals/*/visual.json`
- Test: `_tools/verify-cong-no-template.mjs`

**Interfaces:**
- Consumes: the two status measures from Task 2 and all existing debt measures.
- Produces: a 23-column `pivotTable` plus three labeled template-color group bands above it.

- [ ] **Step 1: Confirm exact pivotTable formatting keys before editing**

Run:

```powershell
powerbi-report-author catalog describe pivotTable
powerbi-report-author formatting describe-object pivotTable rowHeaders
powerbi-report-author formatting describe-object pivotTable columnHeaders
powerbi-report-author formatting describe-object pivotTable values
powerbi-report-author formatting describe-object pivotTable rowTotal
powerbi-report-author formatting describe-object pivotTable grid
```

Expected: `Rows` and `Values` are valid roles; the existing `stepped`, `wordWrap`, `fontColorPrimary`, `backColorPrimary`, and total/grid properties remain valid for the installed CLI catalog.

- [ ] **Step 2: Add template group colors and a reusable group-band helper**

Add to `palette`:

```js
advance: "#FFFF00",
cpc: "#9BC2E6",
invoice: "#A9D18E",
negative: "#C00000",
```

Add this `groupBand` helper with bold centered text, an explicit fill, a 1px border, zero visual header, and 8px internal padding:

```js
const groupBand = ({ id, position, label, background, color = palette.ink }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "textbox",
    objects: {
      general: [{
        properties: {
          paragraphs: [{
            horizontalTextAlignment: "center",
            textRuns: [{
              value: label,
              textStyle: {
                fontFamily: "Segoe UI Semibold",
                fontSize: "10pt",
                fontWeight: "600",
                color,
              },
            }],
          }],
        },
      }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(true), color: fill(background), transparency: num(0) } }],
      border: [{ properties: { show: bool(true), color: fill(palette.border), width: num(1), radius: num(8) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(8), bottom: num(8), left: num(8), right: num(8) } }],
      general: [{ properties: { altText: text(label) } }],
    },
  },
});
```

- [ ] **Step 3: Replace the matrix role bindings with the exact A–W mapping**

Set `Rows.projections` to these seven columns in order:

```js
[
  column("NT/NCC/TV ", "NT/NCC/TV"),
  column("Khu vực chuẩn", "KHU VỰC"),
  column("TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ", "DỰ ÁN"),
  column("PHÁP NHÂN KÝ HĐ/PLHĐ", "PHÁP NHÂN KÝ HĐ"),
  column("SỐ HỢP ĐỒNG CHÍNH", "SỐ HỢP ĐỒNG GỐC"),
  column("NỘI DUNG HỢP ĐỒNG", "NỘI DUNG GÓI THẦU"),
  column("NGÀY KÝ HĐ", "NGÀY KÝ HĐ"),
]
```

Set `Values.projections` to these sixteen measures in order:

```js
[
  measure("Giá trị HĐ + PS gồm VAT", "GIÁ TRỊ HĐ+PS GỒM VAT"),
  measure("Giá trị hóa đơn chưa VAT", "GIÁ TRỊ HÓA ĐƠN (CHƯA GỒM VAT)"),
  measure("Giá trị hóa đơn gồm VAT", "(1) GIÁ TRỊ HÓA ĐƠN (GỒM VAT)"),
  measure("Giá trị tạm ứng", "(2) GIÁ TRỊ TẠM ỨNG"),
  measure("(3) Khấu trừ tạm ứng", "(3) KHẤU TRỪ TẠM ỨNG"),
  measure("(4) Tạm ứng chưa thu hồi", "(4)=(2)-(3) TẠM ỨNG CHƯA THU HỒI"),
  measure("(5) Công nợ đã có CPC", "(5) CÔNG NỢ ĐÃ CÓ CPC GỒM TẠM ỨNG + WD"),
  measure("(6) Đã thanh toán", "(6) ĐÃ THANH TOÁN GỒM ỨNG + WD"),
  measure("(7) Giá trị Swap", "(7) GIÁ TRỊ SWAP"),
  measure("(8) Công nợ CPC còn lại", "(8)=(5)-(6)-(7) CPC CÒN LẠI"),
  measure("(9) Công nợ sau trừ tạm ứng", "(9)=(8)-(4) SAU TRỪ TẠM ỨNG"),
  measure("(10) Tổng nợ phải trả", "(10)=(1)-(6)-(7) TỔNG NỢ PHẢI TRẢ"),
  measure("(11) Tiền bảo hành giữ lại", "(11) TIỀN BẢO HÀNH GIỮ LẠI"),
  measure("(12) Tổng còn lại phải trả", "(12)=(10)-(11) CÒN LẠI PHẢI TRẢ"),
  measure("Tình trạng HĐ (dòng)", "Tình trạng HĐ"),
  measure("Tình trạng quyết toán (dòng)", "TÌNH TRẠNG QUYẾT TOÁN"),
]
```

- [ ] **Step 4: Apply hierarchy, totals, and readable dense-table formatting**

Set row headers to non-stepped layout, expand/collapse enabled, 8–9pt text, and word wrap off. Keep column headers centered, bold, wrapped, and at least 8pt. Keep alternating row backgrounds, horizontal grid lines, row totals, and `stylePreset: None`. Use a display title of `1. CÔNG NỢ THEO NHÀ THẦU • ĐỒNG` and alt text that enumerates the three groups and the 23-column scope.

Use this formatting block after confirming the properties in Step 1:

```js
objects: {
  columnHeaders: [{ properties: {
    columnAdjustment: text("growToFit"),
    autoSizeColumnWidth: bool(true),
    backColor: fill("#DCEBFA"),
    fontColor: fill(palette.ink),
    fontFamily: text("Segoe UI Semibold"),
    fontSize: num(8),
    bold: bool(true),
    alignment: text("Center"),
    wordWrap: bool(true),
    titleAlignment: text("Left"),
  } }],
  rowHeaders: [{ properties: {
    fontFamily: text("Segoe UI"),
    fontSize: num(8),
    fontColor: fill(palette.ink),
    backColor: fill(palette.surface),
    stepped: bool(false),
    wordWrap: bool(false),
    showExpandCollapseButtons: bool(true),
    expandCollapseButtonsColor: fill(palette.blue),
  } }],
  values: [{ properties: {
    fontFamily: text("Segoe UI"),
    fontSize: num(8),
    fontColorPrimary: fill(palette.ink),
    fontColorSecondary: fill(palette.ink),
    backColorPrimary: fill(palette.surface),
    backColorSecondary: fill("#F8FAFC"),
    bandedRowHeaders: bool(true),
  } }],
  rowTotal: [{ properties: {
    fontColor: fill(palette.negative),
    backColor: fill("#FFF7ED"),
    bold: bool(true),
  } }],
  columnTotal: [{ properties: {
    fontColor: fill(palette.ink),
    backColor: fill("#FFF7ED"),
    bold: bool(true),
  } }],
  grid: [{ properties: {
    gridHorizontal: bool(true),
    gridVertical: bool(true),
    gridHorizontalColor: fill("#D9E2EC"),
    gridVerticalColor: fill("#E8EEF5"),
  } }],
},
```

- [ ] **Step 5: Reserve 40px for the group key and resize the matrix**

Use these 8px-grid positions:

```js
groupBand({ id: "c3000000000000000015", position: { x: 296, y: 568, z: 6000, height: 40, width: 496, tabOrder: 18000 }, label: "THEO DÕI TẠM ỨNG • (2)–(4)", background: palette.advance }),
groupBand({ id: "c3000000000000000016", position: { x: 808, y: 568, z: 6000, height: 40, width: 496, tabOrder: 19000 }, label: "CÔNG NỢ THEO CPC • (5)–(9)", background: palette.cpc }),
groupBand({ id: "c3000000000000000017", position: { x: 1320, y: 568, z: 6000, height: 40, width: 568, tabOrder: 20000 }, label: "CÔNG NỢ THEO HÓA ĐƠN • (10)–(12)", background: palette.invoice }),
matrix({ id: "c3000000000000000014", position: { x: 296, y: 624, z: 7000, height: 424, width: 1592, tabOrder: 21000 } }),
```

The 16px vertical gutter between the 40px group key and the matrix prevents overlap. The bands are a persistent legend for the template groups; column labels inside the matrix retain exact formula numbers while users scroll horizontally.

- [ ] **Step 6: Regenerate the page**

Run:

```powershell
node _tools\build-cong-no-page.mjs
```

Expected: output reports page `c031b9f45a2e4d7b81f0` built with 23 visuals: the existing 20 plus three group bands.

- [ ] **Step 7: Run the structural verifier**

Run:

```powershell
node _tools\verify-cong-no-template.mjs
```

Expected: PASS with `7 row fields + 16 value fields = 23 columns`.

- [ ] **Step 8: Validate PBIR immediately after generation**

Run:

```powershell
powerbi-report-author validate "DASHBOARD TQT.Report" --no-schema --format text
```

Expected: `0 error(s), 0 warning(s); result=succeeded`.

---

### Task 4: Reconcile DAX totals and verify Desktop rendering

**Files:**
- Create through screenshot command: `_artifacts/debt-template-review/Công nợ.png`
- Validate: `DASHBOARD TQT.Report`

**Interfaces:**
- Consumes: validated TMDL/PBIR from Tasks 2–3.
- Produces: DAX reconciliation evidence, Desktop screenshot evidence, and final validation status.

- [ ] **Step 1: Reconcile the five formula measures in one DAX query**

Use Modeling MCP `dax_query_operations` with operation `Execute` and result mode `Inline`:

```DAX
EVALUATE
ROW (
    "(4) stored", [(4) Tạm ứng chưa thu hồi],
    "(4) recomputed", [Giá trị tạm ứng] - [(3) Khấu trừ tạm ứng],
    "(8) stored", [(8) Công nợ CPC còn lại],
    "(8) recomputed", [(5) Công nợ đã có CPC] - [(6) Đã thanh toán] - [(7) Giá trị Swap],
    "(9) stored", [(9) Công nợ sau trừ tạm ứng],
    "(9) recomputed", [(8) Công nợ CPC còn lại] - [(4) Tạm ứng chưa thu hồi],
    "(10) stored", [(10) Tổng nợ phải trả],
    "(10) recomputed", [Giá trị hóa đơn gồm VAT] - [(6) Đã thanh toán] - [(7) Giá trị Swap],
    "(12) stored", [(12) Tổng còn lại phải trả],
    "(12) recomputed", [(10) Tổng nợ phải trả] - [(11) Tiền bảo hành giữ lại]
)
```

Expected: every stored/recomputed pair is equal.

- [ ] **Step 2: Reload the correct Desktop instance**

Run `powerbi-desktop status`. Select the PID whose `currentFile` is the target PBIP. If `hasUnsavedChanges` is true, stop and ask the user to save or discard those UI changes. Otherwise assign the discovered numeric PID to `$targetPid` and run:

```powershell
powerbi-desktop reload --pid $targetPid --wait-seconds 120
```

Expected: reload succeeds without `ReportDefinitionValidationFailed`.

- [ ] **Step 3: Capture the Công nợ page**

Run:

```powershell
New-Item -ItemType Directory -Force -Path '_artifacts\debt-template-review' | Out-Null
powerbi-desktop screenshot c031b9f45a2e4d7b81f0 --pid $targetPid --output '_artifacts\debt-template-review\Công nợ.png'
```

Expected: a non-empty PNG for the target page.

- [ ] **Step 4: Review the screenshot against the acceptance checklist**

Verify all of the following in the rendered page:

- KPI cards, both ranking charts, and all six slicers remain visible.
- Three group bands are aligned, readable, and use yellow/blue/green respectively.
- Matrix title, column headers, and first data rows render without blank/error placeholders.
- The matrix starts below the group bands and ends within the 1080px canvas.
- Row hierarchy expand/collapse icons are visible; flat row columns do not overlap.
- Header text wraps; no text is smaller than 8pt.
- Negative values show a minus sign and red text when a visible negative row/value is present.
- Horizontal scrolling is available for the full A–W column set.

If any severe defect appears, edit only `_tools/build-cong-no-page.mjs`, regenerate, validate, reload, and retake the same screenshot until the checklist passes.

- [ ] **Step 5: Run the final verification bundle**

Run:

```powershell
node _tools\verify-cong-no-template.mjs
powerbi-report-author preview-pages "DASHBOARD TQT.Report"
powerbi-report-author preview-visuals "DASHBOARD TQT.Report"
powerbi-report-author validate "DASHBOARD TQT.Report" --no-schema --format text
```

Expected:

- verifier passes;
- report still has exactly three pages;
- `Công nợ` has the existing slicers/cards/charts, the three group bands, and one 23-column `pivotTable`;
- validation returns 0 errors and 0 warnings.

- [ ] **Step 6: Report completion**

Summarize the model measures added, the exact 23-column matrix contract, the DAX reconciliation result, validation result, and screenshot path. Explicitly note the accepted Power BI horizontal-scroll behavior.
