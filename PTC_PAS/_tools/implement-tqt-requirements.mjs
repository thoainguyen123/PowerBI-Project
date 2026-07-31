import fs from "node:fs";
import path from "node:path";

const root = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS\\DASHBOARD TQT.Report";
const pagesRoot = path.join(root, "definition", "pages");
const page1 = "5bd3737f4bb0549b9e5c";
const page2 = "bdeba8b7c925406c4124";
const schema = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json";

const palette = {
  canvas: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F7FB",
  ink: "#172033",
  muted: "#6B7A90",
  border: "#DFE7F1",
  blue: "#2B8FD8",
  navy: "#174A7E",
  cyan: "#2AA7C9",
  teal: "#0E8F9C",
  green: "#1F9D74",
  greenDark: "#147A5A",
  orange: "#E39A2F",
  amber: "#F1BD69",
  coral: "#E76F51",
  red: "#D9534F",
  slate: "#4F6D8A",
  lightBlue: "#7EB8DA",
  neutral: "#AEB9C7",
};

const statusColors = {
  "Đã quyết toán": palette.green,
  "Đã quyết toán/thanh lý": palette.greenDark,
  "Đã thanh lý": palette.teal,
  "NT đang hoàn tất HSQT": palette.blue,
  "Đang thống nhất HSQT": palette.cyan,
  "Đang trình HSQT": palette.lightBlue,
  "PAS đang kiểm": palette.slate,
  "NT chưa nộp HSQT": palette.orange,
  "Nhà thầu không phối hợp": palette.coral,
  "Chưa cập nhật": palette.neutral,
  "Hủy hợp đồng": palette.red,
  "NT đã nộp (thất lạc HS)": palette.amber,
};

const expr = (value) => ({ expr: { Literal: { Value: value } } });
const bool = (value) => expr(value ? "true" : "false");
const num = (value, suffix = "D") => expr(`${value}${suffix}`);
const text = (value) => expr(`'${String(value).replaceAll("'", "''")}'`);
const fill = (hex) => ({ solid: { color: text(hex) } });

const column = (entity, property, active = undefined) => {
  const projection = {
    field: {
      Column: {
        Expression: { SourceRef: { Entity: entity } },
        Property: property,
      },
    },
    queryRef: `${entity}.${property}`,
    nativeQueryRef: property,
  };
  if (active !== undefined) projection.active = active;
  return projection;
};

const measure = (entity, property) => ({
  field: {
    Measure: {
      Expression: { SourceRef: { Entity: entity } },
      Property: property,
    },
  },
  queryRef: `${entity}.${property}`,
  nativeQueryRef: property,
});

const measureExpr = (entity, property) => ({
  Measure: {
    Expression: { SourceRef: { Entity: entity } },
    Property: property,
  },
});

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const visualPath = (pageId, visualId) =>
  path.join(pagesRoot, pageId, "visuals", visualId, "visual.json");

const panel = (titleValue, altText = titleValue) => ({
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
  dropShadow: [{
    properties: {
      show: bool(true),
      preset: text("BottomRight"),
      color: fill("#9AA8BA"),
      transparency: num(96),
      position: text("Outer"),
    },
  }],
  visualHeader: [{ properties: { show: bool(false) } }],
  padding: [{
    properties: {
      top: num(10),
      bottom: num(10),
      left: num(10),
      right: num(10),
    },
  }],
  title: [{
    properties: {
      show: bool(true),
      text: text(titleValue),
      fontFamily: text("Segoe UI Semibold"),
      fontSize: num(13),
      bold: bool(true),
      fontColor: fill(palette.ink),
      background: fill(palette.surface),
      alignment: text("left"),
    },
  }],
  general: [{
    properties: {
      altText: text(altText),
    },
  }],
});

const scopeSelector = (entity, property, value) => ({
  data: [{
    scopeId: {
      Comparison: {
        ComparisonKind: 0,
        Left: {
          Column: {
            Expression: { SourceRef: { Entity: entity } },
            Property: property,
          },
        },
        Right: {
          Literal: {
            Value: `'${String(value).replaceAll("'", "''")}'`,
          },
        },
      },
    },
  }],
});

const categoryDataPoints = (entity, property, colors) => [
  {
    properties: {
      defaultColor: fill(palette.neutral),
      borderShow: bool(false),
    },
  },
  ...Object.entries(colors).map(([value, color]) => ({
    properties: {
      fill: fill(color),
      borderShow: bool(false),
    },
    selector: scopeSelector(entity, property, value),
  })),
];

const card = ({
  id,
  position,
  measureName,
  label,
  color,
  percent = false,
}) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "cardVisual",
    query: {
      queryState: {
        Data: { projections: [measure("Data", measureName)] },
      },
    },
    objects: {
      outline: [{
        properties: { show: bool(false) },
        selector: { id: "default" },
      }],
      value: [{
        properties: {
          show: bool(true),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(31),
          bold: bool(true),
          fontColor: fill(color),
          horizontalAlignment: text("left"),
          labelDisplayUnits: text("0"),
          labelPrecision: num(percent ? 1 : 0, "L"),
        },
        selector: { id: "default" },
      }],
      label: [{
        properties: {
          show: bool(true),
          text: text(label),
          position: text("aboveValue"),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(11),
          fontColor: fill(palette.muted),
          horizontalAlignment: text("left"),
          textWrap: bool(true),
        },
        selector: { id: "default" },
      }],
      cardCalloutArea: [{
        properties: {
          show: bool(true),
          paddingUniform: num(18, "L"),
          rectangleRoundedCurve: num(14, "L"),
          backgroundFillColor: fill(palette.surface),
          backgroundTransparency: num(0),
        },
      }],
      accentBar: [{
        properties: {
          show: bool(true),
          position: text("Top"),
          width: num(4),
          color: fill(color),
        },
        selector: { id: "default" },
      }],
      divider: [{
        properties: { show: bool(false) },
        selector: { id: "default" },
      }],
      layout: [{
        properties: {
          style: text("Table"),
          orientation: num(0),
          customizeLines: bool(true),
          topOuterMargin: num(0, "L"),
          bottomOuterMargin: num(0, "L"),
          leftOuterMargin: num(0, "L"),
          rightOuterMargin: num(0, "L"),
          paddingUniform: num(0, "L"),
        },
        selector: { id: "default" },
      }],
    },
    visualContainerObjects: {
      ...panel(label, `Chỉ số ${label}`),
      title: [{ properties: { show: bool(false) } }],
      padding: [{
        properties: {
          top: num(0),
          bottom: num(0),
          left: num(0),
          right: num(0),
        },
      }],
    },
  },
});

const donut = ({ id, position }) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "donutChart",
    query: {
      queryState: {
        Category: {
          projections: [column("Data", "Tình trạng quyết toán (chuẩn)", true)],
        },
        Y: {
          projections: [measure("Data", "(2) Số HĐ cần quyết toán 2026")],
        },
      },
      sortDefinition: {
        sort: [{
          field: measureExpr("Data", "(2) Số HĐ cần quyết toán 2026"),
          direction: "Descending",
        }],
        isDefaultSort: false,
      },
    },
    objects: {
      legend: [{
        properties: {
          show: bool(true),
          position: text("RightCenter"),
          showTitle: bool(false),
          fontFamily: text("Segoe UI"),
          fontSize: num(9),
          labelColor: fill(palette.muted),
        },
      }],
      labels: [{
        properties: {
          show: bool(true),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(9),
          color: fill(palette.ink),
          labelDisplayUnits: text("0"),
          labelPrecision: num(0, "L"),
          percentageLabelPrecision: num(1, "L"),
          labelStyle: text("Data value, percent of total"),
          position: text("preferOutside"),
          overflow: bool(true),
          background: text("off"),
        },
      }],
      dataPoint: categoryDataPoints(
        "Data",
        "Tình trạng quyết toán (chuẩn)",
        statusColors,
      ),
    },
    visualContainerObjects: panel(
      "TÌNH TRẠNG QUYẾT TOÁN 2026",
      "Biểu đồ tròn tình trạng quyết toán cho hợp đồng có ngày mục tiêu năm 2026",
    ),
  },
});

const stackedColumn = ({ id, position }) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "columnChart",
    query: {
      queryState: {
        Category: {
          projections: [column("Data", "Khu vực chuẩn", true)],
        },
        Series: {
          projections: [column("Data", "Tình trạng quyết toán (chuẩn)", true)],
        },
        Y: {
          projections: [measure("Data", "(2) Số HĐ cần quyết toán 2026")],
        },
      },
      sortDefinition: {
        sort: [{
          field: measureExpr("Data", "(2) Số HĐ cần quyết toán 2026"),
          direction: "Descending",
        }],
        isDefaultSort: false,
      },
    },
    objects: {
      categoryAxis: [{
        properties: {
          show: bool(true),
          fontFamily: text("Segoe UI"),
          fontSize: num(9),
          labelColor: fill(palette.muted),
          innerPadding: num(24, "L"),
          showAxisTitle: bool(false),
          gridlineShow: bool(false),
        },
      }],
      valueAxis: [{
        properties: {
          show: bool(true),
          start: num(0),
          fontFamily: text("Segoe UI"),
          fontSize: num(9),
          labelColor: fill(palette.muted),
          gridlineShow: bool(true),
          gridlineColor: fill("#E7EDF5"),
          showAxisTitle: bool(false),
        },
      }],
      legend: [{
        properties: {
          show: bool(true),
          position: text("Top"),
          showTitle: bool(false),
          fontFamily: text("Segoe UI"),
          fontSize: num(8),
          labelColor: fill(palette.muted),
        },
      }],
      labels: [{
        properties: {
          show: bool(false),
        },
      }],
      dataPoint: categoryDataPoints(
        "Data",
        "Tình trạng quyết toán (chuẩn)",
        statusColors,
      ),
    },
    visualContainerObjects: panel(
      "TÌNH TRẠNG QUYẾT TOÁN 2026 THEO KHU VỰC",
      "Cột chồng số hợp đồng mục tiêu 2026, chia theo tình trạng và khu vực",
    ),
  },
});

const conditionalValue = (percentRef) => ({
  properties: {
    backColor: {
      solid: {
        color: {
          expr: {
            FillRule: {
              Input: { SelectRef: { ExpressionName: percentRef } },
              FillRule: {
                linearGradient3: {
                  min: {
                    color: { Literal: { Value: "'#F8E1E0'" } },
                    value: { Literal: { Value: "0D" } },
                  },
                  mid: {
                    color: { Literal: { Value: "'#FAECD7'" } },
                    value: { Literal: { Value: "0.5D" } },
                  },
                  max: {
                    color: { Literal: { Value: "'#DDF4EC'" } },
                    value: { Literal: { Value: "1D" } },
                  },
                  nullColoringStrategy: {
                    strategy: { Literal: { Value: "'noColor'" } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  selector: {
    data: [{ dataViewWildcard: { matchingOption: 1 } }],
    metadata: percentRef,
  },
});

const matrix = ({
  id,
  position,
  titleValue,
  rows,
  values,
  percentRefs,
  sortEntity,
  sortMeasure,
  expandedFirstLevel = [],
}) => {
  const result = {
    $schema: schema,
    name: id,
    position,
    visual: {
      visualType: "pivotTable",
      query: {
        queryState: {
          Rows: {
            projections: rows.map(([entity, property]) => column(entity, property, true)),
          },
          Values: {
            projections: values.map(([entity, property]) => measure(entity, property)),
          },
        },
        sortDefinition: {
          sort: [{
            field: measureExpr(sortEntity, sortMeasure),
            direction: "Descending",
          }],
          isDefaultSort: false,
        },
      },
      objects: {
        columnHeaders: [{
          properties: {
            columnAdjustment: text("growToFit"),
            autoSizeColumnWidth: bool(true),
            backColor: fill(palette.surfaceAlt),
            fontColor: fill(palette.ink),
            fontFamily: text("Segoe UI Semibold"),
            fontSize: num(9),
            bold: bool(true),
            alignment: text("Center"),
            wordWrap: bool(true),
            titleAlignment: text("Left"),
          },
        }],
        rowHeaders: [{
          properties: {
            fontFamily: text("Segoe UI"),
            fontSize: num(9),
            fontColor: fill(palette.ink),
            backColor: fill(palette.surface),
            stepped: bool(true),
            steppedLayoutIndentation: num(14),
            wordWrap: bool(false),
            showExpandCollapseButtons: bool(true),
            expandCollapseButtonsColor: fill(palette.blue),
          },
        }],
        values: [
          {
            properties: {
              fontFamily: text("Segoe UI"),
              fontSize: num(9),
              fontColorPrimary: fill(palette.ink),
              fontColorSecondary: fill(palette.ink),
              backColorPrimary: fill(palette.surface),
              backColorSecondary: fill("#F8FAFC"),
              bandedRowHeaders: bool(true),
            },
          },
          ...percentRefs.map(conditionalValue),
        ],
        rowTotal: [{
          properties: {
            fontColor: fill(palette.ink),
            backColor: fill("#DCEFFE"),
            bold: bool(true),
          },
        }],
        columnTotal: [{
          properties: {
            fontColor: fill(palette.ink),
            backColor: fill("#DCEFFE"),
            bold: bool(true),
          },
        }],
        grid: [{
          properties: {
            gridHorizontal: bool(true),
            gridVertical: bool(false),
            gridHorizontalColor: fill("#EDF2F7"),
          },
        }],
      },
      visualContainerObjects: {
        ...panel(titleValue),
        stylePreset: [{ properties: { name: text("None") } }],
      },
    },
  };

  if (expandedFirstLevel.length > 0 && rows.length > 1) {
    const [firstEntity, firstProperty] = rows[0];
    result.visual.expansionStates = [{
      roles: ["Rows"],
      levels: [
        {
          queryRefs: [`${firstEntity}.${firstProperty}`],
          isCollapsed: true,
          identityKeys: [{
            Column: {
              Expression: { SourceRef: { Entity: firstEntity } },
              Property: firstProperty,
            },
          }],
          isPinned: true,
        },
        {
          queryRefs: [`${rows[1][0]}.${rows[1][1]}`],
          isCollapsed: true,
          isPinned: true,
        },
      ],
      root: {
        children: expandedFirstLevel.map((value) => ({
          identityValues: [{
            Literal: {
              Value: `'${String(value).replaceAll("'", "''")}'`,
            },
          }],
          isToggled: true,
        })),
      },
    }];
  }

  return result;
};

const replaceVisualStrings = (pageId, visualId, replacements) => {
  const file = visualPath(pageId, visualId);
  let raw = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    raw = raw.replaceAll(from, to);
  }
  const visual = JSON.parse(raw);
  delete visual.filterConfig;
  writeJson(file, visual);
};

// Page 1: use the approved KPI definitions and 2026 visuals.
writeJson(
  visualPath(page1, "391ab8b03678954b5ac4"),
  card({
    id: "391ab8b03678954b5ac4",
    position: { x: 296, y: 112, z: 1000, height: 152, width: 334, tabOrder: 9 },
    measureName: "(1) Số HĐ cần quyết toán",
    label: "(1) HĐ cần quyết toán",
    color: palette.blue,
  }),
);

writeJson(
  visualPath(page1, "a1000000000000000008"),
  card({
    id: "a1000000000000000008",
    position: { x: 652, y: 112, z: 1000, height: 152, width: 330, tabOrder: 10 },
    measureName: "(2) Số HĐ cần quyết toán 2026",
    label: "(2) Mục tiêu 2026",
    color: palette.orange,
  }),
);

writeJson(
  visualPath(page1, "a1000000000000000009"),
  card({
    id: "a1000000000000000009",
    position: { x: 1002, y: 112, z: 1000, height: 152, width: 330, tabOrder: 11 },
    measureName: "(3) Số HĐ hoàn thành 2026",
    label: "(3) Hoàn thành từ 2026",
    color: palette.green,
  }),
);

writeJson(
  visualPath(page1, "a100000000000000000a"),
  card({
    id: "a100000000000000000a",
    position: { x: 1354, y: 112, z: 1000, height: 152, width: 330, tabOrder: 12 },
    measureName: "% Hoàn thành 2026",
    label: "% Hoàn thành 2026",
    color: palette.teal,
    percent: true,
  }),
);

writeJson(
  visualPath(page1, "6c01133a552db7acb6c8"),
  donut({
    id: "6c01133a552db7acb6c8",
    position: { x: 296, y: 288, z: 1000, height: 336, width: 685, tabOrder: 13 },
  }),
);

writeJson(
  visualPath(page1, "a100000000000000000b"),
  stackedColumn({
    id: "a100000000000000000b",
    position: { x: 1002, y: 288, z: 1000, height: 336, width: 685, tabOrder: 14 },
  }),
);

writeJson(
  visualPath(page1, "c5a0234cb3822b023b5c"),
  matrix({
    id: "c5a0234cb3822b023b5c",
    position: {
      x: 296.6666666666667,
      y: 641.6666666666667,
      z: 1001,
      height: 513.3333333333334,
      width: 1390,
      tabOrder: 100,
    },
    titleValue: "KPI QUYẾT TOÁN THEO KHU VỰC / DỰ ÁN",
    rows: [
      ["Data", "Khu vực chuẩn"],
      ["Data", "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ"],
    ],
    values: [
      ["Data", "(1) Số HĐ cần quyết toán"],
      ["Data", "(2) Số HĐ cần quyết toán 2026"],
      ["Data", "(2.1) KPI đã đăng ký"],
      ["Data", "(2.2) Đăng ký thêm"],
      ["Data", "(2.3) Chưa phân loại KPI"],
      ["Data", "(3) Số HĐ hoàn thành 2026"],
      ["Data", "% Hoàn thành theo KPI đã đăng ký"],
      ["Data", "% Hoàn thành 2026"],
      ["Data", "Giá trị đã quyết toán 2026"],
    ],
    percentRefs: [
      "Data.% Hoàn thành 2026",
    ],
    sortEntity: "Data",
    sortMeasure: "(2) Số HĐ cần quyết toán 2026",
    expandedFirstLevel: [
      "BÌNH THUẬN 1",
      "ĐỒNG NAI",
      "HỒ TRÀM",
      "HCM",
      "LÂM ĐỒNG",
      "ĐBSCL",
      "KHÁNH HÒA",
    ],
  }),
);

replaceVisualStrings(
  page1,
  "a1000000000000000007",
  [["TÌNH TRẠNG QUYẾT TOÁN", "Tình trạng quyết toán (chuẩn)"]],
);

const page1TitlePath = visualPath(page1, "fd3619b3945134649638");
const page1Title = JSON.parse(fs.readFileSync(page1TitlePath, "utf8"));
page1Title.visual.objects.general[0].properties.paragraphs[0].textRuns[0].value =
  "Dashboard Quyết Toán 2026";
writeJson(page1TitlePath, page1Title);

const rail1Path = visualPath(page1, "a1000000000000000001");
const rail1 = JSON.parse(fs.readFileSync(rail1Path, "utf8"));
rail1.position.height = 1190;
writeJson(rail1Path, rail1);

// Page 2: track both AK and AL assignment rows with the approved 2026 measures.
replaceVisualStrings(
  page2,
  "3c6a3ac7623c8cf678f4",
  [
    ["Số lượt HĐ cần quyết toán", "(2) Số lượt cần quyết toán 2026"],
    ["LƯỢT HỢP ĐỒNG CẦN QUYẾT TOÁN THEO PIC", "MỤC TIÊU QUYẾT TOÁN 2026 THEO PIC"],
  ],
);

writeJson(
  visualPath(page2, "146945f73a4f1b0a942f"),
  matrix({
    id: "146945f73a4f1b0a942f",
    position: { x: 296, y: 568, z: 1000, height: 480, width: 1592, tabOrder: 10 },
    titleValue: "TRACKING QUYẾT TOÁN 2026 THEO PIC (AK / AL)",
    rows: [
      ["Phân công PIC", "Nhóm PIC"],
      ["Phân công PIC", "PIC phụ trách"],
    ],
    values: [
      ["Phân công PIC", "(1) Số lượt cần quyết toán"],
      ["Phân công PIC", "(2) Số lượt cần quyết toán 2026"],
      ["Phân công PIC", "(2.1) KPI đã đăng ký (PIC)"],
      ["Phân công PIC", "(2.2) Đăng ký thêm (PIC)"],
      ["Phân công PIC", "(2.3) Chưa phân loại KPI (PIC)"],
      ["Phân công PIC", "(3) Số lượt hoàn thành 2026"],
      ["Phân công PIC", "% Hoàn thành theo KPI đã đăng ký (PIC)"],
      ["Phân công PIC", "% Hoàn thành 2026 (PIC)"],
      ["Phân công PIC", "Giá trị đã quyết toán 2026 (PIC)"],
    ],
    percentRefs: [
      "Phân công PIC.% Hoàn thành 2026 (PIC)",
    ],
    sortEntity: "Phân công PIC",
    sortMeasure: "(2) Số lượt cần quyết toán 2026",
    expandedFirstLevel: ["MEP", "Xây dựng/Cung ứng"],
  }),
);

const picNotePath = visualPath(page2, "a2000000000000000004");
const picNote = JSON.parse(fs.readFileSync(picNotePath, "utf8"));
picNote.position.height = 176;
picNote.visual.objects.general[0].properties.paragraphs = [
  {
    textRuns: [{
      value: "Phạm vi dữ liệu",
      textStyle: {
        fontFamily: "Segoe UI Semibold",
        fontSize: "11px",
        fontWeight: "600",
        color: palette.ink,
      },
    }],
    horizontalTextAlignment: "left",
  },
  {
    textRuns: [{
      value: "AK = Xây dựng/Cung ứng • AL = MEP",
      textStyle: {
        fontFamily: "Segoe UI",
        fontSize: "9px",
        fontWeight: "400",
        color: palette.muted,
      },
    }],
    horizontalTextAlignment: "left",
  },
  {
    textRuns: [{
      value: "Một HĐ có cả AK và AL sẽ xuất hiện 2 lượt. Giá trị tại dòng Tổng theo PIC có thể bị cộng trùng.",
      textStyle: {
        fontFamily: "Segoe UI",
        fontSize: "9px",
        fontWeight: "400",
        color: palette.muted,
      },
    }],
    horizontalTextAlignment: "left",
  },
];
writeJson(picNotePath, picNote);

// Cache-busted theme without purple fallback colors.
const themeDir = path.join(root, "StaticResources", "RegisteredResources");
const sourceThemePath = path.join(themeDir, "LightAnalytics-9a3f2c7d.json");
const themeName = "LightAnalytics-TQT2026-4f8c2d71.json";
const themePath = path.join(themeDir, themeName);
const theme = JSON.parse(fs.readFileSync(sourceThemePath, "utf8"));
theme.name = themeName;
theme.dataColors = [
  palette.blue,
  palette.green,
  palette.orange,
  palette.coral,
  palette.teal,
  palette.red,
  palette.slate,
  palette.cyan,
  palette.lightBlue,
  "#66C5A5",
  palette.amber,
  palette.neutral,
];
theme.good = palette.green;
theme.neutral = palette.orange;
theme.bad = palette.red;
theme.maximum = palette.navy;
theme.center = palette.cyan;
theme.minimum = "#D7E6F2";
theme.null = palette.muted;
theme.tableAccent = palette.blue;
writeJson(themePath, theme);

const reportPath = path.join(root, "definition", "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.themeCollection.customTheme.name = themeName;
const registered = report.resourcePackages.find((pkg) => pkg.name === "RegisteredResources");
registered.items = [{
  name: themeName,
  path: themeName,
  type: "CustomTheme",
}];
writeJson(reportPath, report);

console.log("Implemented the 2026 TQT requirements across the region/project and PIC pages.");
