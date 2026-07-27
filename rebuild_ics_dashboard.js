const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(
  "C:",
  "Users",
  "Admin",
  "Desktop",
  "PowerBI Visualize",
  "ICS_NVLG",
  "ICS_Dashboard_v1.0_NLVG.Report"
);
const definition = path.join(root, "definition");
const pagesRoot = path.join(definition, "pages");

const C = {
  navy: "#0F2747",
  teal: "#0E7490",
  blue: "#2563EB",
  violet: "#7C3AED",
  amber: "#D97706",
  red: "#C2410C",
  page: "#F4F7FB",
  white: "#FFFFFF",
  border: "#D9E2EC",
  text: "#102A43",
  muted: "#52667A",
  stripe: "#F7FAFC",
  header: "#0F4660",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function literal(value) {
  if (typeof value === "boolean") {
    return { expr: { Literal: { Value: value ? "true" : "false" } } };
  }
  if (typeof value === "number") {
    return { expr: { Literal: { Value: `${value}D` } } };
  }
  return {
    expr: {
      Literal: {
        Value: `'${String(value).replaceAll("'", "''")}'`,
      },
    },
  };
}

function solid(color) {
  return { solid: { color: literal(color) } };
}

function propOfProjection(projection) {
  const field = projection.field || {};
  for (const kind of ["Measure", "Column", "Aggregation"]) {
    if (field[kind]?.Property) return field[kind].Property;
  }
  return projection.queryRef || "Value";
}

function addNativeQueryRefs(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) addNativeQueryRefs(item);
    return;
  }
  if (node.field && node.queryRef && !node.nativeQueryRef) {
    node.nativeQueryRef = node.displayName || propOfProjection(node);
  }
  for (const value of Object.values(node)) addNativeQueryRefs(value);
}

function renameFilters(node, relativeName, counter = { value: 0 }) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) renameFilters(item, relativeName, counter);
    return;
  }
  if (Array.isArray(node.filters)) {
    node.filters.forEach((filter) => {
      filter.name = crypto
        .createHash("sha1")
        .update(`${relativeName}|filter|${counter.value++}`)
        .digest("hex")
        .slice(0, 20);
    });
  }
  for (const value of Object.values(node)) renameFilters(value, relativeName, counter);
}

function baseVco({ title, subtitle, altText, padding = 8, header = true }) {
  const vco = {
    background: [
      {
        properties: {
          show: literal(true),
          color: solid(C.white),
          transparency: literal(0),
        },
      },
    ],
    border: [
      {
        properties: {
          show: literal(true),
          color: solid(C.border),
          radius: literal(10),
          width: literal(1),
        },
      },
    ],
    padding: [
      {
        properties: {
          top: literal(padding),
          bottom: literal(padding),
          left: literal(padding),
          right: literal(padding),
        },
      },
    ],
    visualHeader: [{ properties: { show: literal(header) } }],
    general: [{ properties: { altText: literal(altText) } }],
  };
  if (title) {
    vco.title = [
      {
        properties: {
          show: literal(true),
          text: literal(title),
          fontFamily: literal("Segoe UI Semibold"),
          fontSize: literal(12),
          bold: literal(true),
          fontColor: solid(C.navy),
          alignment: literal("left"),
          titleWrap: literal(true),
        },
      },
    ];
  } else {
    vco.title = [{ properties: { show: literal(false) } }];
  }
  if (subtitle) {
    vco.subTitle = [
      {
        properties: {
          show: literal(true),
          text: literal(subtitle),
          fontFamily: literal("Segoe UI"),
          fontSize: literal(9),
          fontColor: solid(C.muted),
          alignment: literal("left"),
        },
      },
    ];
  }
  return vco;
}

function position(x, y, width, height, z, tabOrder) {
  return { x, y, z, height, width, tabOrder };
}

const layouts = {
  v01_hdr_shape_000001: position(0, 0, 1500, 96, 0, 0),
  v02_hdr_title_000001: position(24, 16, 1456, 64, 1000, 0),
  v03_card_suvu_00001: position(24, 112, 352, 128, 2000, 1),
  v04_card_behav_00001: position(392, 112, 352, 128, 3000, 2),
  v05_card_ratio_00001: position(760, 112, 352, 128, 4000, 3),
  v06_card_overdue_001: position(1128, 112, 352, 128, 5000, 4),
  v07_chart_trend_0001: position(24, 256, 712, 304, 6000, 5),
  v08_chart_topbeh_0001: position(752, 256, 728, 304, 7000, 6),
  v09_tbl_cases_000001: position(24, 576, 1456, 280, 8000, 7),
  v10_tbl_recurr_000001: position(24, 872, 1456, 304, 9000, 8),
};

const cardSpec = {
  v03_card_suvu_00001: {
    label: "Sự vụ vi phạm",
    accent: C.teal,
    alt: "Tổng số sự vụ vi phạm của đơn vị đang được lọc",
  },
  v04_card_behav_00001: {
    label: "Hành vi lặp lại",
    accent: C.blue,
    alt: "Số hành vi xuất hiện từ hai sự vụ trở lên",
  },
  v05_card_ratio_00001: {
    label: "Tỷ lệ lặp lại",
    accent: C.violet,
    alt: "Tỷ lệ sự vụ thuộc các hành vi lặp lại",
  },
  v06_card_overdue_001: {
    label: "Hành động trễ hạn",
    accent: C.amber,
    alt: "Số kế hoạch khắc phục hoặc ngăn ngừa đang trễ hạn",
  },
};

function styleShape(json) {
  json.visual.objects = {
    shape: [{ properties: { tileShape: literal("rectangle") } }],
    fill: [
      {
        properties: {
          fillColor: solid(C.navy),
          transparency: literal(0),
        },
        selector: { id: "default" },
      },
    ],
    outline: [
      {
        properties: { show: literal(false) },
        selector: { id: "default" },
      },
    ],
  };
  json.visual.visualContainerObjects = {
    background: [{ properties: { show: literal(false) } }],
    border: [{ properties: { show: literal(false) } }],
    padding: [
      {
        properties: {
          top: literal(0),
          bottom: literal(0),
          left: literal(0),
          right: literal(0),
        },
      },
    ],
    visualHeader: [{ properties: { show: literal(false) } }],
  };
}

function styleTextbox(json, displayName) {
  json.visual.objects = {
    general: [
      {
        properties: {
          paragraphs: [
            {
              textRuns: [
                {
                  value: `HÀNH VI LẶP LẠI • ${displayName}`,
                  textStyle: {
                    fontFamily: "Segoe UI Semibold",
                    fontSize: "22px",
                    color: C.white,
                  },
                },
              ],
              horizontalTextAlignment: "left",
            },
            {
              textRuns: [
                {
                  value:
                    "Theo dõi xu hướng, sự vụ, kế hoạch khắc phục–ngăn ngừa, tái diễn và chốt kiểm soát",
                  textStyle: {
                    fontFamily: "Segoe UI",
                    fontSize: "11px",
                    color: "#C7D7E8",
                  },
                },
              ],
              horizontalTextAlignment: "left",
            },
          ],
        },
      },
    ],
  };
  json.visual.visualContainerObjects = {
    background: [{ properties: { show: literal(false) } }],
    border: [{ properties: { show: literal(false) } }],
    padding: [
      {
        properties: {
          top: literal(0),
          bottom: literal(0),
          left: literal(0),
          right: literal(0),
        },
      },
    ],
    visualHeader: [{ properties: { show: literal(false) } }],
  };
}

function styleCard(json, spec) {
  json.visual.objects = {
    value: [
      {
        properties: {
          show: literal(true),
          fontFamily: literal("Segoe UI Semibold"),
          fontSize: literal(26),
          bold: literal(true),
          fontColor: solid(C.navy),
          horizontalAlignment: literal("left"),
        },
        selector: { id: "default" },
      },
    ],
    label: [
      {
        properties: {
          show: literal(true),
          text: literal(spec.label),
          fontFamily: literal("Segoe UI Semibold"),
          fontSize: literal(11),
          bold: literal(true),
          fontColor: solid(C.muted),
          position: literal("belowValue"),
          horizontalAlignment: literal("left"),
        },
        selector: { id: "default" },
      },
    ],
    accentBar: [
      {
        properties: {
          show: literal(true),
          position: literal("Left"),
          color: solid(spec.accent),
          transparency: literal(0),
          width: literal(6),
        },
        selector: { id: "default" },
      },
    ],
    outline: [
      {
        properties: { show: literal(false) },
        selector: { id: "default" },
      },
    ],
    spacing: [
      {
        properties: {
          verticalSpacing: literal(-4),
        },
      },
    ],
  };
  json.visual.visualContainerObjects = baseVco({
    altText: spec.alt,
    padding: 0,
  });
}

function styleLine(json) {
  json.visual.objects = {
    lineStyles: [
      {
        properties: {
          strokeWidth: literal(3),
          lineChartType: literal("smooth"),
          interpolationSmooth: literal("monotoneX"),
          areaShow: literal(true),
          areaMatchStrokeColor: literal(true),
          showMarker: literal(true),
          showMarkerByDefault: literal(true),
          markerShape: literal("circle"),
          markerSize: literal(5),
          markerColor: solid(C.teal),
        },
      },
    ],
    dataPoint: [
      {
        properties: {
          defaultColor: solid(C.teal),
          transparency: literal(82),
        },
      },
    ],
    categoryAxis: [
      {
        properties: {
          showAxisTitle: literal(false),
          gridlineShow: literal(false),
        },
      },
    ],
    valueAxis: [
      {
        properties: {
          showAxisTitle: literal(false),
        },
      },
    ],
  };
  json.visual.visualContainerObjects = baseVco({
    title: "Xu hướng sự vụ lặp lại theo tháng",
    subtitle: "Số sự vụ thuộc nhóm hành vi phát sinh từ 2 lần trở lên",
    altText: "Biểu đồ đường thể hiện xu hướng số sự vụ lặp lại theo tháng",
  });
}

function styleBar(json) {
  if (json.visual.query?.queryState?.Series) {
    delete json.visual.query.queryState.Series;
  }
  json.visual.objects = {
    dataPoint: [
      {
        properties: {
          defaultColor: solid(C.teal),
        },
      },
    ],
    categoryAxis: [
      {
        properties: {
          showAxisTitle: literal(false),
          gridlineShow: literal(false),
        },
      },
    ],
    valueAxis: [
      {
        properties: {
          showAxisTitle: literal(false),
        },
      },
    ],
  };
  json.visual.visualContainerObjects = baseVco({
    title: "Hành vi lặp lại nổi bật của đơn vị",
    subtitle: "Xếp hạng hành vi theo số sự vụ lặp lại",
    altText:
      "Biểu đồ thanh xếp hạng hành vi theo số sự vụ lặp lại của đơn vị",
  });
}

function styleTable(json, recurrence) {
  const originalProjections =
    json.visual.query?.queryState?.Values?.projections || [];
  let formattedProjections = originalProjections;
  if (recurrence) {
    const rows = [
      {
        field: {
          Column: {
            Expression: { SourceRef: { Entity: "ICS" } },
            Property: "behavior_name",
          },
        },
        queryRef: "ICS.behavior_name",
        displayName: "Hành vi vi phạm",
        nativeQueryRef: "Hành vi vi phạm",
        active: true,
      },
    ];
    const values = originalProjections.filter((p) => p.field?.Measure);
    formattedProjections = [...rows, ...values];
    json.visual.visualType = "pivotTable";
    json.visual.query.queryState = {
      Rows: { projections: rows },
      Values: { projections: values },
    };
  }

  const widthMap = recurrence
    ? {
        "ICS.behavior_name": 340,
        "EmptyTable.So_Vu_Lap_Lai": 100,
        "EmptyTable.Trang_Thai_Tai_Dien_Label": 260,
        "EmptyTable.De_Xuat_Chot_Kiem_Soat": 560,
      }
    : {
        "ICS.case_code": 85,
        "ICS.recognizedDate": 125,
        "ICS.company_name": 150,
        "ICS.behavior_name": 240,
        "ICS.violation_summary": 260,
        "ICS.action_summary": 260,
        "ICS.action_plant_type": 140,
        "ICS.endDate": 110,
        "ICS.action_format": 140,
        "ICS.link": 70,
      };

  json.visual.objects = {
    columnHeaders: [
      {
        properties: {
          autoSizeColumnWidth: literal(false),
          columnAdjustment: literal("fixedWidth"),
          defaultColumnWidth: literal(recurrence ? 210 : 170),
          customColumnWidth: literal(false),
          fontFamily: literal("Segoe UI Semibold"),
          fontSize: literal(10),
          bold: literal(true),
          fontColor: solid(C.white),
          backColor: solid(C.header),
          wordWrap: literal(true),
        },
      },
    ],
    values: [
      {
        properties: {
          fontFamily: literal("Segoe UI"),
          fontSize: literal(9),
          fontColorPrimary: solid(C.text),
          fontColorSecondary: solid(C.text),
          backColorPrimary: solid(C.white),
          backColorSecondary: solid(C.stripe),
          wordWrap: literal(false),
          urlIcon: literal(true),
        },
      },
    ],
    columnWidth: formattedProjections
      .filter((p) => widthMap[p.queryRef])
      .map((p) => ({
        properties: { value: literal(widthMap[p.queryRef]) },
        selector: { metadata: p.queryRef },
      })),
  };
  if (recurrence) {
    json.visual.objects.rowHeaders = [
      {
        properties: {
          stepped: literal(false),
          repeatRowHeaders: literal(true),
          wordWrap: literal(false),
          showExpandCollapseButtons: literal(false),
          fontFamily: literal("Segoe UI"),
          fontSize: literal(9),
          fontColor: solid(C.text),
          backColor: solid(C.white),
        },
      },
    ];
  }
  const title = recurrence
    ? "Đánh giá tái diễn & đề xuất chốt kiểm soát"
    : "Chi tiết sự vụ & kế hoạch khắc phục/ngăn ngừa";
  const subtitle = recurrence
    ? "Kiểm tra tái diễn sau hoàn thành ngăn ngừa và đề xuất kiểm soát"
    : "Danh sách sự vụ cùng kế hoạch khắc phục/ngăn ngừa tương ứng";
  const altText = recurrence
    ? "Bảng đánh giá hành vi có tái diễn sau ngăn ngừa và đề xuất chốt kiểm soát"
    : "Bảng chi tiết sự vụ và kế hoạch khắc phục ngăn ngừa tương ứng";
  json.visual.visualContainerObjects = baseVco({
    title,
    subtitle,
    altText,
    padding: 0,
  });
  json.visual.visualContainerObjects.stylePreset = [
    { properties: { name: literal("None") } },
  ];
}

const themeName = `ICS-Control-${crypto
  .createHash("sha1")
  .update("ICS-Control-v1")
  .digest("hex")
  .slice(0, 8)}.json`;
const theme = {
  $schema:
    "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json",
  name: themeName,
  dataColors: [
    C.teal,
    C.blue,
    C.violet,
    C.amber,
    "#0F766E",
    "#B45309",
    C.red,
    "#64748B",
  ],
  good: "#0F766E",
  neutral: C.amber,
  bad: C.red,
  maximum: C.blue,
  center: C.amber,
  minimum: "#D9EAF2",
  null: "#94A3B8",
  foreground: C.text,
  foregroundNeutralSecondary: C.muted,
  foregroundNeutralTertiary: "#829AB1",
  backgroundLight: C.page,
  backgroundNeutral: C.border,
  background: C.white,
  tableAccent: C.teal,
  textClasses: {
    callout: {
      fontSize: 28,
      fontFace: "Segoe UI Semibold",
      color: C.navy,
    },
    title: {
      fontSize: 14,
      fontFace: "Segoe UI Semibold",
      color: C.navy,
    },
    header: {
      fontSize: 12,
      fontFace: "Segoe UI Semibold",
      color: C.text,
    },
    label: { fontSize: 10, fontFace: "Segoe UI", color: C.text },
  },
  visualStyles: {
    "*": {
      "*": {
        dropShadow: [{ show: false }],
        categoryAxis: [
          {
            gridlineStyle: "dotted",
            gridlineColor: { solid: { color: "#E7EDF3" } },
          },
        ],
        valueAxis: [
          {
            gridlineStyle: "dotted",
            gridlineColor: { solid: { color: "#E7EDF3" } },
          },
        ],
      },
    },
    cardVisual: {
      "*": {
        cardCalloutArea: [{ paddingUniform: 0 }],
      },
    },
    textbox: {
      "*": {
        padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
        background: [{ show: false }],
        border: [{ show: false }],
      },
    },
    tableEx: {
      "*": {
        columnHeaders: [
          {
            autoSizeColumnWidth: true,
            columnAdjustment: "growToFit",
            backColor: { solid: { color: C.header } },
            fontColor: { solid: { color: C.white } },
            bold: true,
          },
        ],
        values: [
          {
            backColorPrimary: { solid: { color: C.white } },
            backColorSecondary: { solid: { color: C.stripe } },
            fontColorPrimary: { solid: { color: C.text } },
            fontColorSecondary: { solid: { color: C.text } },
          },
        ],
      },
    },
    lineChart: {
      "*": {
        labels: [{ show: true, labelPosition: "Above", fontSize: 9 }],
        legend: [{ show: false }],
        categoryAxis: [{ showAxisTitle: false, gridlineShow: false }],
        valueAxis: [{ showAxisTitle: false }],
      },
    },
    clusteredBarChart: {
      "*": {
        labels: [{ show: true, fontSize: 9 }],
        legend: [{ show: false }],
        categoryAxis: [{ showAxisTitle: false, gridlineShow: false }],
        valueAxis: [{ showAxisTitle: false }],
      },
    },
  },
};

const themeDir = path.join(root, "StaticResources", "RegisteredResources");
fs.mkdirSync(themeDir, { recursive: true });
writeJson(path.join(themeDir, themeName), theme);

const pageDirs = fs
  .readdirSync(pagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const pageId of pageDirs) {
  const pageFile = path.join(pagesRoot, pageId, "page.json");
  const page = readJson(pageFile);
  page.displayOption = "FitToPage";
  page.width = 1500;
  page.height = 1200;
  page.objects = {
    ...(page.objects || {}),
    background: [
      {
        properties: {
          color: solid(C.page),
          transparency: literal(0),
        },
      },
    ],
  };
  renameFilters(page, `pages/${pageId}/page.json`);
  writeJson(pageFile, page);

  const visualsDir = path.join(pagesRoot, pageId, "visuals");
  const visualDirs = fs
    .readdirSync(visualsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const visualDir of visualDirs) {
    const visualFile = path.join(visualsDir, visualDir, "visual.json");
    const json = readJson(visualFile);
    if (layouts[json.name]) json.position = layouts[json.name];

    addNativeQueryRefs(json.visual?.query);
    renameFilters(json, `pages/${pageId}/visuals/${visualDir}/visual.json`);

    if (json.name === "v01_hdr_shape_000001") styleShape(json);
    else if (json.name === "v02_hdr_title_000001")
      styleTextbox(json, page.displayName);
    else if (cardSpec[json.name]) styleCard(json, cardSpec[json.name]);
    else if (json.name === "v07_chart_trend_0001") styleLine(json);
    else if (json.name === "v08_chart_topbeh_0001") styleBar(json);
    else if (json.name === "v09_tbl_cases_000001") styleTable(json, false);
    else if (json.name === "v10_tbl_recurr_000001") styleTable(json, true);

    writeJson(visualFile, json);
  }
}

const reportFile = path.join(definition, "report.json");
const report = readJson(reportFile);
addNativeQueryRefs(report);
renameFilters(report, "report.json");
report.themeCollection = {
  ...(report.themeCollection || {}),
  customTheme: {
    name: themeName,
    reportVersionAtImport:
      report.themeCollection?.baseTheme?.reportVersionAtImport || {
        visual: "1.8.101",
        report: "2.0.101",
        page: "1.3.101",
      },
    type: "RegisteredResources",
  },
};
report.resourcePackages = (report.resourcePackages || []).filter(
  (pkg) => pkg.name !== "RegisteredResources"
);
report.resourcePackages.push({
  name: "RegisteredResources",
  type: "RegisteredResources",
  items: [
    {
      name: themeName,
      path: themeName,
      type: "CustomTheme",
    },
  ],
});
report.objects = {
  ...(report.objects || {}),
  outspacePane: [
    {
      properties: {
        expanded: literal(false),
      },
    },
  ],
};
writeJson(reportFile, report);

console.log(
  `Rebuilt ${pageDirs.length} pages and registered theme ${themeName}.`
);
