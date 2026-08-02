import fs from "node:fs";
import path from "node:path";

const reportRoot = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS\\DASHBOARD TQT.Report";
const pagesRoot = path.join(reportRoot, "definition", "pages");
const pageId = "c031b9f45a2e4d7b81f0";
const pageRoot = path.join(pagesRoot, pageId);
const visualsRoot = path.join(pageRoot, "visuals");
const visualSchema = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.11.0/schema.json";

const palette = {
  canvas: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F7FB",
  ink: "#172033",
  muted: "#6B7A90",
  border: "#DFE7F1",
  blue: "#2B8FD8",
  blueTint: "#CFE8F8",
  teal: "#0E8F9C",
  orange: "#E39A2F",
  slate: "#4F6D8A",
  coral: "#E76F51",
  coralTint: "#FAD9D1",
};

const expr = (value) => ({ expr: { Literal: { Value: value } } });
const bool = (value) => expr(value ? "true" : "false");
const num = (value, suffix = "D") => expr(`${value}${suffix}`);
const text = (value) => expr(`'${String(value).replaceAll("'", "''")}'`);
const fill = (hex) => ({ solid: { color: text(hex) } });

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const column = (property, nativeQueryRef = property, active = true) => ({
  field: {
    Column: {
      Expression: { SourceRef: { Entity: "Data" } },
      Property: property,
    },
  },
  queryRef: `Data.${property}`,
  nativeQueryRef,
  displayName: nativeQueryRef,
  active,
});

const measure = (property, displayName = property) => ({
  field: {
    Measure: {
      Expression: { SourceRef: { Entity: "Data" } },
      Property: property,
    },
  },
  queryRef: `Data.${property}`,
  nativeQueryRef: displayName,
  displayName,
});

const measureExpr = (property) => ({
  Measure: {
    Expression: { SourceRef: { Entity: "Data" } },
    Property: property,
  },
});

const vco = (titleValue, altText = titleValue, padding = 8) => ({
  background: [{
    properties: {
      show: bool(true),
      color: fill(palette.surface),
      transparency: num(0),
    },
  }],
  border: [{
    properties: {
      show: bool(true),
      color: fill(palette.border),
      width: num(1),
      radius: num(16),
    },
  }],
  visualHeader: [{ properties: { show: bool(false) } }],
  padding: [{
    properties: {
      top: num(padding),
      bottom: num(padding),
      left: num(padding),
      right: num(padding),
    },
  }],
  title: [{
    properties: {
      show: bool(true),
      text: text(titleValue),
      fontFamily: text("Segoe UI Semibold"),
      fontSize: num(12),
      bold: bool(true),
      fontColor: fill(palette.ink),
      background: fill(palette.surface),
      alignment: text("left"),
    },
  }],
  general: [{ properties: { altText: text(altText) } }],
});

const textbox = ({ id, position, runs, alignment = "left", pill = false }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "textbox",
    objects: {
      general: [{
        properties: {
          paragraphs: [{ textRuns: runs, horizontalTextAlignment: alignment }],
        },
      }],
    },
    visualContainerObjects: {
      background: [{
        properties: {
          show: bool(pill),
          ...(pill ? { color: fill(palette.surface), transparency: num(0) } : {}),
        },
      }],
      border: [{
        properties: {
          show: bool(pill),
          ...(pill ? { color: fill(palette.border), width: num(1), radius: num(12) } : {}),
        },
      }],
      visualHeader: [{ properties: { show: bool(false) } }],
      padding: [{
        properties: {
          top: num(pill ? 8 : 0), bottom: num(pill ? 8 : 0),
          left: num(pill ? 12 : 0), right: num(pill ? 12 : 0),
        },
      }],
    },
  },
});

const shape = ({ id, position }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "shape",
    objects: {
      shape: [{ properties: { tileShape: text("rectangle") }, selector: { id: "default" } }],
      fill: [{ properties: { fillColor: fill(palette.surface), transparency: num(0) }, selector: { id: "default" } }],
      outline: [{ properties: { show: bool(true), lineColor: fill(palette.border), weight: num(1), transparency: num(0) }, selector: { id: "default" } }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(false) } }],
      border: [{ properties: { show: bool(false) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
    },
  },
});

const slicer = ({ id, position, property, label }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "slicer",
    query: { queryState: { Values: { projections: [column(property, label)] } } },
    objects: {
      data: [{ properties: { mode: text("Dropdown") } }],
      header: [{
        properties: {
          show: bool(true), text: text(label), fontFamily: text("Segoe UI Semibold"),
          textSize: num(10), bold: bool(true), fontColor: fill(palette.muted), background: fill(palette.surface),
        },
      }],
      items: [{
        properties: {
          fontFamily: text("Segoe UI"), textSize: num(9), fontColor: fill(palette.ink),
          background: fill(palette.surface), padding: num(2),
        },
      }],
    },
    visualContainerObjects: {
      background: [{ properties: { show: bool(true), color: fill(palette.surface), transparency: num(0) } }],
      border: [{ properties: { show: bool(true), color: fill(palette.border), width: num(1), radius: num(12) } }],
      visualHeader: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
      general: [{ properties: { altText: text(`Bộ lọc ${label}`) } }],
    },
  },
});

const card = ({ id, position, measureName, label, color }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "cardVisual",
    query: { queryState: { Data: { projections: [measure(measureName)] } } },
    objects: {
      outline: [{ properties: { show: bool(false) }, selector: { id: "default" } }],
      value: [{
        properties: {
          show: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: num(24), bold: bool(true),
          fontColor: fill(color), horizontalAlignment: text("left"), labelDisplayUnits: text("0"),
          labelPrecision: num(1, "L"),
        },
        selector: { id: "default" },
      }],
      label: [{
        properties: {
          show: bool(true), text: text(label), position: text("aboveValue"),
          fontFamily: text("Segoe UI Semibold"), fontSize: num(9), fontColor: fill(palette.muted),
          horizontalAlignment: text("left"), textWrap: bool(true),
        },
        selector: { id: "default" },
      }],
      cardCalloutArea: [{ properties: { show: bool(true), paddingUniform: num(14, "L"), rectangleRoundedCurve: num(14, "L"), backgroundFillColor: fill(palette.surface), backgroundTransparency: num(0) } }],
      accentBar: [{ properties: { show: bool(true), position: text("Top"), width: num(4), color: fill(color) }, selector: { id: "default" } }],
      divider: [{ properties: { show: bool(false) }, selector: { id: "default" } }],
      layout: [{
        properties: { style: text("Table"), orientation: num(0), customizeLines: bool(true), topOuterMargin: num(0, "L"), bottomOuterMargin: num(0, "L"), leftOuterMargin: num(0, "L"), rightOuterMargin: num(0, "L"), paddingUniform: num(0, "L") },
        selector: { id: "default" },
      }],
    },
    visualContainerObjects: {
      ...vco(label, `KPI ${label}`, 0),
      title: [{ properties: { show: bool(false) } }],
      padding: [{ properties: { top: num(0), bottom: num(0), left: num(0), right: num(0) } }],
    },
  },
});

const barChart = ({ id, position, category, categoryLabel, titleValue }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "barChart",
    query: {
      queryState: {
        Category: { projections: [column(category, categoryLabel)] },
        Y: { projections: [measure("(12) Tổng còn lại phải trả (tỷ)", "Còn lại phải trả (tỷ đồng)")] },
      },
      sortDefinition: {
        sort: [{ field: measureExpr("(12) Tổng còn lại phải trả (tỷ)"), direction: "Descending" }],
        isDefaultSort: false,
      },
    },
    objects: {
      categoryAxis: [{ properties: { show: bool(true), fontFamily: text("Segoe UI"), fontSize: num(9), labelColor: fill(palette.muted), innerPadding: num(24, "L"), maxMarginFactor: num(35, "L"), showAxisTitle: bool(false), gridlineShow: bool(false) } }],
      valueAxis: [{ properties: { show: bool(false), gridlineShow: bool(false), showAxisTitle: bool(false) } }],
      labels: [{ properties: { show: bool(true), labelPosition: text("OutsideEnd"), optimizeLabelDisplay: bool(true), labelOverflow: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: num(9), color: fill(palette.ink), labelDisplayUnits: text("0"), labelPrecision: num(1, "L") } }],
      legend: [{ properties: { show: bool(false) } }],
      dataPoint: [{
        properties: {
          fill: { solid: { color: { expr: { FillRule: { Input: measureExpr("(12) Tổng còn lại phải trả (tỷ)"), FillRule: { linearGradient2: { min: { color: { Literal: { Value: `'${palette.coralTint}'` } } }, max: { color: { Literal: { Value: `'${palette.coral}'` } } }, nullColoringStrategy: { strategy: { Literal: { Value: "'noColor'" } } } } } } } } } },
          borderShow: bool(false),
        },
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] },
      }],
    },
    visualContainerObjects: vco(titleValue, `${titleValue}. Sắp xếp giảm dần theo tổng còn lại phải trả, đơn vị tỷ đồng.`, 10),
  },
});

const matrix = ({ id, position }) => ({
  $schema: visualSchema,
  name: id,
  position,
  visual: {
    visualType: "pivotTable",
    query: {
      queryState: {
        Rows: { projections: [
          column("Khu vực chuẩn", "Khu vực"),
          column("TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ", "Dự án/Đơn vị"),
          column("NT/NCC/TV ", "Nhà thầu"),
          column("SỐ HỢP ĐỒNG CHÍNH", "Số hợp đồng"),
        ] },
        Values: { projections: [
          measure("(4) Tạm ứng chưa thu hồi", "(4) Tạm ứng chưa thu hồi"),
          measure("(8) Công nợ CPC còn lại", "(8) CPC còn lại"),
          measure("(9) Công nợ sau trừ tạm ứng", "(9) Sau trừ tạm ứng"),
          measure("(10) Tổng nợ phải trả", "(10) Tổng nợ phải trả"),
          measure("(11) Tiền bảo hành giữ lại", "(11) Bảo hành giữ lại"),
          measure("(12) Tổng còn lại phải trả", "(12) Còn lại phải trả"),
        ] },
      },
      sortDefinition: {
        sort: [{ field: measureExpr("(12) Tổng còn lại phải trả"), direction: "Descending" }],
        isDefaultSort: false,
      },
    },
    objects: {
      columnHeaders: [{ properties: { columnAdjustment: text("growToFit"), autoSizeColumnWidth: bool(true), backColor: fill(palette.surfaceAlt), fontColor: fill(palette.ink), fontFamily: text("Segoe UI Semibold"), fontSize: num(8), bold: bool(true), alignment: text("Center"), wordWrap: bool(true), titleAlignment: text("Left") } }],
      rowHeaders: [{ properties: { fontFamily: text("Segoe UI"), fontSize: num(9), fontColor: fill(palette.ink), backColor: fill(palette.surface), stepped: bool(true), steppedLayoutIndentation: num(14), wordWrap: bool(false), showExpandCollapseButtons: bool(true), expandCollapseButtonsColor: fill(palette.blue) } }],
      values: [{ properties: { fontFamily: text("Segoe UI"), fontSize: num(9), fontColorPrimary: fill(palette.ink), fontColorSecondary: fill(palette.ink), backColorPrimary: fill(palette.surface), backColorSecondary: fill("#F8FAFC"), bandedRowHeaders: bool(true) } }],
      rowTotal: [{ properties: { fontColor: fill(palette.ink), backColor: fill("#DCEFFE"), bold: bool(true) } }],
      columnTotal: [{ properties: { fontColor: fill(palette.ink), backColor: fill("#DCEFFE"), bold: bool(true) } }],
      grid: [{ properties: { gridHorizontal: bool(true), gridVertical: bool(false), gridHorizontalColor: fill("#EDF2F7") } }],
    },
    visualContainerObjects: {
      ...vco("CHI TIẾT CÔNG NỢ THEO HỢP ĐỒNG • ĐỒNG", "Matrix chi tiết công nợ theo khu vực, dự án, nhà thầu và hợp đồng; đơn vị đồng.", 8),
      stylePreset: [{ properties: { name: text("None") } }],
    },
  },
});

fs.mkdirSync(visualsRoot, { recursive: true });
for (const child of fs.readdirSync(visualsRoot, { withFileTypes: true })) {
  if (child.isDirectory()) fs.rmSync(path.join(visualsRoot, child.name), { recursive: true, force: true });
}

writeJson(path.join(pageRoot, "page.json"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  name: pageId,
  displayName: "Công nợ",
  displayOption: "FitToPage",
  height: 1080,
  width: 1920,
  objects: {
    background: [{ properties: { color: fill(palette.canvas), transparency: num(0) } }],
  },
});

const visuals = [
  shape({ id: "c3000000000000000001", position: { x: 0, y: 0, z: 0, height: 1080, width: 264, tabOrder: 19000 } }),
  textbox({ id: "c3000000000000000002", position: { x: 24, y: 24, z: 1000, height: 48, width: 216, tabOrder: 0 }, runs: [
    { value: "TQT", textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "20pt", color: palette.ink } },
    { value: "  Analytics", textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "13pt", color: palette.blue } },
  ] }),
  textbox({ id: "c3000000000000000003", position: { x: 24, y: 104, z: 1000, height: 24, width: 216, tabOrder: 1000 }, runs: [
    { value: "BỘ LỌC CÔNG NỢ", textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "11pt", color: palette.muted } },
  ], alignment: "center" }),
  slicer({ id: "c3000000000000000004", position: { x: 24, y: 144, z: 2000, height: 80, width: 216, tabOrder: 2000 }, property: "NT/NCC/TV ", label: "Nhà thầu" }),
  slicer({ id: "c3000000000000000005", position: { x: 24, y: 240, z: 2000, height: 80, width: 216, tabOrder: 3000 }, property: "Khu vực chuẩn", label: "Khu vực" }),
  slicer({ id: "c3000000000000000006", position: { x: 24, y: 336, z: 2000, height: 80, width: 216, tabOrder: 4000 }, property: "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ", label: "Dự án/Đơn vị" }),
  slicer({ id: "c3000000000000000007", position: { x: 24, y: 432, z: 2000, height: 80, width: 216, tabOrder: 5000 }, property: "PHÁP NHÂN KÝ HĐ/PLHĐ", label: "Pháp nhân ký HĐ" }),
  slicer({ id: "c3000000000000000008", position: { x: 24, y: 528, z: 2000, height: 80, width: 216, tabOrder: 6000 }, property: "TÌNH TRẠNG THỰC HIỆN HĐ", label: "Tình trạng HĐ" }),
  slicer({ id: "c3000000000000000009", position: { x: 24, y: 624, z: 2000, height: 80, width: 216, tabOrder: 7000 }, property: "Tình trạng quyết toán (chuẩn)", label: "Tình trạng quyết toán" }),
  textbox({ id: "c300000000000000000a", position: { x: 24, y: 736, z: 2000, height: 120, width: 216, tabOrder: 8000 }, runs: [
    { value: "Cách đọc\n", textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "10pt", color: palette.ink } },
    { value: "KPI và biểu đồ dùng tỷ đồng; matrix dùng đồng. Chọn khu vực hoặc nhà thầu để thu hẹp tới hợp đồng.", textStyle: { fontFamily: "Segoe UI", fontSize: "9pt", color: palette.muted } },
  ], pill: true }),
  textbox({ id: "c300000000000000000b", position: { x: 296, y: 24, z: 3000, height: 64, width: 1120, tabOrder: 9000 }, runs: [
    { value: "Công nợ còn lại cần thanh toán", textStyle: { fontFamily: "Segoe UI Semibold", fontSize: "24pt", fontWeight: "600", color: palette.ink } },
  ] }),
  textbox({ id: "c300000000000000000c", position: { x: 1592, y: 24, z: 3000, height: 48, width: 296, tabOrder: 10000 }, runs: [
    { value: "KPI & biểu đồ: Tỷ đồng", textStyle: { fontFamily: "Segoe UI", fontSize: "10pt", color: palette.muted } },
  ], alignment: "center", pill: true }),
  card({ id: "c300000000000000000d", position: { x: 296, y: 112, z: 4000, height: 128, width: 304, tabOrder: 11000 }, measureName: "(8) Công nợ CPC còn lại (tỷ)", label: "(8) CPC còn lại • Tỷ đồng", color: palette.blue }),
  card({ id: "c300000000000000000e", position: { x: 616, y: 112, z: 4000, height: 128, width: 304, tabOrder: 12000 }, measureName: "(9) Công nợ sau trừ tạm ứng (tỷ)", label: "(9) Sau trừ tạm ứng • Tỷ đồng", color: palette.teal }),
  card({ id: "c300000000000000000f", position: { x: 936, y: 112, z: 4000, height: 128, width: 304, tabOrder: 13000 }, measureName: "(10) Tổng nợ phải trả (tỷ)", label: "(10) Tổng nợ phải trả • Tỷ đồng", color: palette.orange }),
  card({ id: "c3000000000000000010", position: { x: 1256, y: 112, z: 4000, height: 128, width: 304, tabOrder: 14000 }, measureName: "(11) Tiền bảo hành giữ lại (tỷ)", label: "(11) Bảo hành giữ lại • Tỷ đồng", color: palette.slate }),
  card({ id: "c3000000000000000011", position: { x: 1576, y: 112, z: 4000, height: 128, width: 304, tabOrder: 15000 }, measureName: "(12) Tổng còn lại phải trả (tỷ)", label: "(12) Còn lại phải trả • Tỷ đồng", color: palette.coral }),
  barChart({ id: "c3000000000000000012", position: { x: 296, y: 264, z: 5000, height: 280, width: 784, tabOrder: 16000 }, category: "Khu vực chuẩn", categoryLabel: "Khu vực", titleValue: "CÒN PHẢI TRẢ THEO KHU VỰC • TỶ ĐỒNG" }),
  barChart({ id: "c3000000000000000013", position: { x: 1096, y: 264, z: 5000, height: 280, width: 792, tabOrder: 17000 }, category: "NT/NCC/TV ", categoryLabel: "Nhà thầu", titleValue: "CÒN PHẢI TRẢ THEO NHÀ THẦU • TỶ ĐỒNG" }),
  matrix({ id: "c3000000000000000014", position: { x: 296, y: 568, z: 6000, height: 480, width: 1592, tabOrder: 18000 } }),
];

for (const visual of visuals) {
  writeJson(path.join(visualsRoot, visual.name, "visual.json"), visual);
}

const pagesPath = path.join(pagesRoot, "pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
if (!pages.pageOrder.includes(pageId)) pages.pageOrder.push(pageId);
writeJson(pagesPath, pages);

console.log(`Built page ${pageId} (${visuals.length} visuals).`);
