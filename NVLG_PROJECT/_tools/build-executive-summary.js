const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const reportRoot = path.join(projectRoot, "NVLG PROJECTS.Report");
const pagesRoot = path.join(reportRoot, "definition", "pages");
const pageName = "e5e8a3b7c1d24f609a12";
const pageRoot = path.join(pagesRoot, pageName);
const visualsRoot = path.join(pageRoot, "visuals");

const schemaVisual = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.10.0/schema.json";
const navy = "#173B70";
const cyan = "#1599B5";
const teal = "#177E89";
const green = "#2E7D32";
const amber = "#F9A825";
const orange = "#E67E22";
const red = "#C62828";
const text = "#26374A";
const muted = "#5B667A";
const border = "#DDE3EC";
const white = "#FFFFFF";

const lit = (value) => ({ expr: { Literal: { Value: value } } });
const bool = (value) => lit(value ? "true" : "false");
const int = (value) => lit(`${value}L`);
const dec = (value) => lit(`${value}D`);
const str = (value) => lit(`'${String(value).replaceAll("'", "''")}'`);
const color = (value) => ({ solid: { color: str(value) } });
const idFor = (key) => crypto.createHash("sha1").update(`nvlg-exec-${key}`).digest("hex").slice(0, 20);
const pos = (x, y, width, height, z) => ({ x, y, z, width, height, tabOrder: z });
const source = (entity) => ({ SourceRef: { Entity: entity } });
const column = (entity, property) => ({
  Column: { Expression: source(entity), Property: property },
});
const measure = (entity, property) => ({
  Measure: { Expression: source(entity), Property: property },
});

function containerObjects(title, altText) {
  const result = {
    background: [{
      properties: {
        show: bool(true),
        color: color(white),
        transparency: int(0),
      },
    }],
    border: [{
      properties: {
        show: bool(true),
        color: color(border),
        radius: int(8),
        width: int(1),
      },
    }],
    dropShadow: [{ properties: { show: bool(false) } }],
    visualHeader: [{ properties: { show: bool(false) } }],
    padding: [{
      properties: {
        top: int(4),
        bottom: int(4),
        left: int(6),
        right: int(6),
      },
    }],
    general: [{
      properties: {
        altText: str(altText),
      },
    }],
  };
  if (title) {
    result.title = [{
      properties: {
        show: bool(true),
        text: str(title),
        bold: bool(true),
        fontSize: dec(10),
        fontColor: color(navy),
        alignment: str("left"),
        titleWrap: bool(true),
        fontFamily: str("Segoe UI Semibold"),
      },
    }];
  }
  return result;
}

function projection(entity, property, displayName) {
  return {
    field: measure(entity, property),
    queryRef: `${entity}.${property}`,
    nativeQueryRef: displayName,
    displayName,
  };
}

function cardVisual(key, position, title, accent, fields, columns) {
  const projections = fields.map((field) => projection(field.entity, field.property, field.displayName));
  const valueObjects = [{
    properties: {
      show: bool(true),
      fontSize: dec(fields.length >= 4 ? 18 : 21),
      fontColor: color(accent),
      bold: bool(true),
      horizontalAlignment: str("center"),
      labelDisplayUnits: str("0"),
    },
    selector: { id: "default" },
  }];
  const labelObjects = [{
    properties: {
      show: bool(true),
      fontSize: dec(8),
      fontColor: color(muted),
      horizontalAlignment: str("center"),
    },
    selector: { id: "default" },
  }];
  for (const field of fields) {
    if (!field.color && field.precision === undefined) continue;
    const properties = {};
    if (field.color) properties.fontColor = color(field.color);
    if (field.precision !== undefined) properties.labelPrecision = int(field.precision);
    valueObjects.push({
      properties,
      selector: { metadata: `${field.entity}.${field.property}` },
    });
  }
  return {
    $schema: schemaVisual,
    name: idFor(key),
    position,
    visual: {
      visualType: "cardVisual",
      query: {
        queryState: { Data: { projections } },
      },
      objects: {
        value: valueObjects,
        label: labelObjects,
        layout: [{
          properties: {
            style: str("Cards"),
            autoGrid: bool(false),
            columnCount: int(columns),
            maxTiles: int(fields.length),
            cellPadding: int(2),
            alignment: str("middle"),
          },
        }],
        fillCustom: [{
          properties: {
            show: bool(true),
            fillColor: color(white),
            transparency: int(0),
          },
          selector: { id: "default" },
        }],
        shapeCustomRectangle: [{
          properties: {
            tileShape: str("rectangleRoundedByPixel"),
            rectangleRoundedCurve: int(6),
          },
          selector: { id: "default" },
        }],
        outline: [{
          properties: { show: bool(false) },
          selector: { id: "default" },
        }],
        accentBar: [{
          properties: {
            show: bool(true),
            width: int(4),
            color: color(accent),
            position: str("Left"),
          },
          selector: { id: "default" },
        }],
        padding: [{
          properties: { paddingUniform: int(4) },
          selector: { id: "default" },
        }],
      },
      visualContainerObjects: containerObjects(title, `${title}: các chỉ số tổng hợp cập nhật theo bộ lọc hiện tại.`),
      drillFilterOtherVisuals: true,
    },
  };
}

function barVisual(key, position, title, categoryDef, measureDef, fill, options = {}) {
  const categoryField = column(categoryDef.entity, categoryDef.property);
  const measureField = measure(measureDef.entity, measureDef.property);
  const dataPoint = [{
    properties: {
      defaultColor: color(fill),
      fill: color(fill),
      borderShow: bool(false),
      fillTransparency: int(4),
    },
  }];
  for (const item of options.semanticColors || []) {
    dataPoint.push({
      properties: { fill: color(item.color) },
      selector: {
        data: [{
          scopeId: {
            Comparison: {
              ComparisonKind: 0,
              Left: column(categoryDef.entity, categoryDef.property),
              Right: { Literal: { Value: `'${item.value.replaceAll("'", "''")}'` } },
            },
          },
        }],
      },
    });
  }
  return {
    $schema: schemaVisual,
    name: idFor(key),
    position,
    visual: {
      visualType: "barChart",
      query: {
        queryState: {
          Category: {
            projections: [{
              field: categoryField,
              queryRef: `${categoryDef.entity}.${categoryDef.property}`,
              nativeQueryRef: categoryDef.displayName,
              displayName: categoryDef.displayName,
              active: true,
            }],
          },
          Y: {
            projections: [{
              field: measureField,
              queryRef: `${measureDef.entity}.${measureDef.property}`,
              nativeQueryRef: measureDef.displayName,
              displayName: measureDef.displayName,
            }],
          },
        },
        sortDefinition: {
          sort: [{ field: measureField, direction: "Descending" }],
          isDefaultSort: true,
        },
      },
      objects: {
        dataPoint,
        labels: [{
          properties: {
            show: bool(true),
            labelPosition: str("OutsideEnd"),
            fontSize: dec(options.compact ? 8 : 9),
            color: color(text),
            labelContentLayout: str("SingleLine"),
            enableBackground: bool(false),
            optimizeLabelDisplay: bool(false),
          },
        }],
        categoryAxis: [{
          properties: {
            show: bool(true),
            fontSize: dec(options.compact ? 8 : 9),
            labelColor: color(text),
            maxMarginFactor: int(options.maxMargin || 36),
            innerPadding: int(options.innerPadding || 24),
            showAxisTitle: bool(false),
          },
        }],
        valueAxis: [{
          properties: {
            show: bool(false),
            start: int(0),
            gridlineShow: bool(false),
            labelColor: color(muted),
          },
        }],
        legend: [{ properties: { show: bool(false) } }],
        ribbonBands: [{ properties: { show: bool(false) } }],
      },
      visualContainerObjects: containerObjects(title, options.altText || `${title}. Thanh ngang được sắp xếp giảm dần theo giá trị.`),
      drillFilterOtherVisuals: true,
    },
  };
}

function textBox(key, position, runs, alignment = "left") {
  return {
    $schema: schemaVisual,
    name: idFor(key),
    position,
    visual: {
      visualType: "textbox",
      objects: {
        general: [{
          properties: {
            paragraphs: runs.map((run) => ({
              textRuns: [{
                value: run.value,
                textStyle: {
                  fontWeight: run.bold ? "bold" : "normal",
                  fontSize: `${run.size}pt`,
                  color: run.color,
                  fontFamily: "Segoe UI",
                },
              }],
              horizontalTextAlignment: alignment,
            })),
          },
        }],
      },
      visualContainerObjects: {
        background: [{ properties: { show: bool(false) } }],
        visualHeader: [{ properties: { show: bool(false) } }],
        general: [{ properties: { altText: str(runs.map((r) => r.value).join(" ")) } }],
      },
      drillFilterOtherVisuals: true,
    },
  };
}

function logoVisual() {
  return {
    $schema: schemaVisual,
    name: idFor("logo"),
    position: pos(1000, 16, 144, 56, 2000),
    visual: {
      visualType: "image",
      objects: {
        general: [{
          properties: {
            imageUrl: {
              expr: {
                ResourcePackageItem: {
                  PackageName: "RegisteredResources",
                  PackageType: 1,
                  ItemName: "Novaland_Logo.svg_(1)3307565663718103.png",
                },
              },
            },
          },
        }],
      },
      visualContainerObjects: {
        general: [{ properties: { altText: str("Logo NovaLand") } }],
      },
      drillFilterOtherVisuals: true,
    },
    howCreated: "InsertVisualButton",
  };
}

const visuals = [
  textBox("title", pos(24, 16, 912, 72, 1000), [
    { value: "TOÀN CẢNH DANH MỤC DỰ ÁN, PHÁP LÝ VÀ NGUỒN LỰC", size: 20, bold: true, color: navy },
    { value: "Executive Summary · Cơ cấu danh mục dự án", size: 10, bold: false, color: muted },
  ]),
  logoVisual(),
  cardVisual("project-kpis", pos(24, 104, 368, 144, 3000), "DANH MỤC DỰ ÁN", cyan, [
    { entity: "DanhMucDauTu", property: "Executive Tổng bản ghi dự án", displayName: "Bản ghi dự án / phân khu" },
    { entity: "DanhMucDauTu", property: "Executive Tỷ trọng giai đoạn đầu", displayName: "Nghiên cứu + thiết kế", color: teal },
  ], 2),
  cardVisual("legal-kpis", pos(408, 104, 368, 144, 4000), "TIẾN ĐỘ PHÁP LÝ", green, [
    { entity: "Eoffice_TD", property: "PL Tổng hạng mục", displayName: "Hạng mục pháp lý" },
    { entity: "Eoffice_TD", property: "PL Tỷ lệ hoàn thành", displayName: "Tỷ lệ hoàn thành", color: green, precision: 1 },
    { entity: "Eoffice_TD", property: "PL Quá hạn", displayName: "Quá hạn", color: red },
  ], 3),
  cardVisual("hr-kpis", pos(792, 104, 352, 144, 5000), "NHÂN SỰ", orange, [
    { entity: "Head_Count", property: "Executive Kế hoạch headcount 2026", displayName: "Kế hoạch 2026", color: navy },
    { entity: "Head_Count", property: "Executive Headcount tháng hiện tại", displayName: "HC tháng", color: teal },
    { entity: "Head_Count", property: "Executive Đang làm việc", displayName: "Đang làm việc", color: green },
    { entity: "Head_Count", property: "Executive Đang tuyển", displayName: "Đang tuyển", color: orange },
  ], 2),
  barVisual(
    "portfolio-status",
    pos(24, 264, 552, 304, 6000),
    "CƠ CẤU DANH MỤC THEO HIỆN TRẠNG ĐẦU TƯ",
    { entity: "DanhMucDauTu", property: "Hiện trạng đầu tư Executive", displayName: "Hiện trạng đầu tư" },
    { entity: "DanhMucDauTu", property: "Executive Tổng bản ghi dự án", displayName: "Số lượng" },
    cyan,
    { maxMargin: 42, innerPadding: 18, altText: "Cơ cấu danh mục theo hiện trạng đầu tư, sắp xếp từ nhiều đến ít." },
  ),
  barVisual(
    "top-regions",
    pos(592, 264, 552, 304, 7000),
    "6 VÙNG CÓ NHIỀU BẢN GHI DỰ ÁN / PHÂN KHU NHẤT",
    { entity: "DanhMucDauTu", property: "Ten Vung", displayName: "Vùng" },
    { entity: "DanhMucDauTu", property: "Executive Top 6 vùng", displayName: "Số lượng" },
    navy,
    { maxMargin: 34, innerPadding: 24, altText: "Sáu vùng có nhiều bản ghi dự án và phân khu nhất." },
  ),
  barVisual(
    "legal-status",
    pos(24, 584, 368, 336, 8000),
    "TRẠNG THÁI HẠNG MỤC PHÁP LÝ",
    { entity: "Eoffice_TD", property: "Legal_Status", displayName: "Trạng thái" },
    { entity: "Eoffice_TD", property: "PL Tổng hạng mục", displayName: "Số hạng mục" },
    green,
    {
      compact: true,
      maxMargin: 42,
      innerPadding: 28,
      semanticColors: [
        { value: "Hoàn thành", color: green },
        { value: "Đang thực hiện", color: cyan },
        { value: "Chưa thực hiện", color: amber },
        { value: "Quá hạn", color: red },
      ],
      altText: "Trạng thái các hạng mục pháp lý; màu đỏ đánh dấu quá hạn và mỗi thanh đều có nhãn số.",
    },
  ),
  barVisual(
    "department-progress",
    pos(408, 584, 368, 336, 9000),
    "TIẾN ĐỘ TRUNG BÌNH THEO PHÒNG BAN",
    { entity: "Eoffice_TD", property: "Phong_Nhom", displayName: "Phòng ban" },
    { entity: "Eoffice_TD", property: "Executive Tiến độ phòng ban", displayName: "Tiến độ" },
    teal,
    { compact: true, maxMargin: 30, innerPadding: 14, altText: "Tiến độ trung bình theo phòng ban, sắp xếp giảm dần." },
  ),
  barVisual(
    "hiring-demand",
    pos(792, 584, 352, 336, 10000),
    "NHU CẦU TUYỂN THEO PHÒNG BAN",
    { entity: "Head_Count", property: "Phòng ban", displayName: "Phòng ban" },
    { entity: "Head_Count", property: "Executive Top 8 phòng ban đang tuyển", displayName: "Đang tuyển" },
    orange,
    { compact: true, maxMargin: 42, innerPadding: 18, altText: "Tám phòng ban có nhu cầu tuyển cao nhất." },
  ),
  textBox("footer", pos(24, 928, 1120, 40, 11000), [
    { value: "Nguồn: Danh mục đầu tư · E-office · Headcount  |  Số liệu tự cập nhật theo lần refresh semantic model gần nhất.", size: 8, bold: false, color: muted },
  ]),
];

fs.mkdirSync(visualsRoot, { recursive: true });
fs.writeFileSync(path.join(pageRoot, "page.json"), `${JSON.stringify({
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.0.0/schema.json",
  name: pageName,
  displayName: "Executive Summary",
  displayOption: "FitToPage",
  height: 980,
  width: 1170,
  objects: {
    background: [{
      properties: {
        transparency: dec(0),
        color: color("#F4F7FB"),
      },
    }],
  },
}, null, 2)}\n`, "utf8");

for (const visual of visuals) {
  const visualDir = path.join(visualsRoot, visual.name);
  fs.mkdirSync(visualDir, { recursive: true });
  fs.writeFileSync(path.join(visualDir, "visual.json"), `${JSON.stringify(visual, null, 2)}\n`, "utf8");
}

const pagesPath = path.join(pagesRoot, "pages.json");
const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
pages.pageOrder = [pageName, ...pages.pageOrder.filter((item) => item !== pageName)];
pages.activePageName = pageName;
fs.writeFileSync(pagesPath, `${JSON.stringify(pages, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  pageName,
  pageRoot,
  visualCount: visuals.length,
  firstPage: pages.pageOrder[0],
  activePageName: pages.activePageName,
}, null, 2));
