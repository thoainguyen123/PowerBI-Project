import fs from "node:fs";
import path from "node:path";

const root = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS\\DASHBOARD TQT.Report";
const definition = path.join(root, "definition");
const pagesRoot = path.join(definition, "pages");
const page1 = "5bd3737f4bb0549b9e5c";
const page2 = "bdeba8b7c925406c4124";
const schema = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json";
const previousThemeName = "MidnightOperations-72f4c1a9.json";
const themeName = "LightAnalytics-9a3f2c7d.json";

const palette = {
  canvas: "#F4F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  ink: "#172033",
  muted: "#6B7A90",
  border: "#DFE7F1",
  cyan: "#2B8FD8",
  cyanTint: "#DCEFFE",
  teal: "#0E8F9C",
  tealTint: "#D8F1F3",
  green: "#1F9D74",
  greenTint: "#DDF4EC",
  orange: "#E39A2F",
  orangeTint: "#FAECD7",
  red: "#D9534F",
  redTint: "#F8E1E0",
  chartBlue: "#2477E0",
  chartBlueTint: "#8DB9F3",
  chartCoral: "#E76F51",
  chartCoralTint: "#F4B09B",
  chartSlate: "#4F6D8A",
  chartSlateTint: "#B3C1CD",
  chartGreen: "#168A6A",
  chartGreenTint: "#86C8B4",
  chartOrange: "#E8891C",
  chartOrangeTint: "#F3C27D",
  chartRed: "#D9505B",
  chartNeutral: "#AEB8C5",
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

const noChrome = () => ({
  background: [{ properties: { show: bool(false) } }],
  border: [{ properties: { show: bool(false) } }],
  visualHeader: [{ properties: { show: bool(false) } }],
  padding: [{
    properties: {
      top: num(0),
      bottom: num(0),
      left: num(0),
      right: num(0),
    },
  }],
});

const panel = (titleValue, padding = 12) => {
  const result = {
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
        top: num(padding),
        bottom: num(padding),
        left: num(padding),
        right: num(padding),
      },
    }],
  };
  if (titleValue) {
    result.title = [{
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
    }];
  }
  return result;
};

const richTextbox = (id, position, paragraphs, chrome = noChrome()) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "textbox",
    objects: {
      general: [{ properties: { paragraphs } }],
    },
    visualContainerObjects: chrome,
  },
});

const textRun = (value, {
  family = "Segoe UI",
  size = 12,
  weight = "400",
  color = palette.ink,
} = {}) => ({
  value,
  textStyle: {
    fontFamily: family,
    fontSize: `${size}px`,
    fontWeight: weight,
    color,
  },
});

const paragraph = (runs, alignment = "left") => ({
  textRuns: runs,
  horizontalTextAlignment: alignment,
});

const railShape = (id, position) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "shape",
    objects: {
      shape: [{
        properties: { tileShape: text("rectangle") },
        selector: { id: "default" },
      }],
      fill: [{
        properties: {
          fillColor: fill(palette.surface),
          transparency: num(0),
        },
        selector: { id: "default" },
      }],
      outline: [{
        properties: {
          show: bool(true),
          lineColor: fill(palette.border),
          weight: num(1),
          transparency: num(0),
        },
        selector: { id: "default" },
      }],
    },
    visualContainerObjects: noChrome(),
  },
});

const slicer = (id, position, entity, property, label) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "slicer",
    query: {
      queryState: {
        Values: { projections: [column(entity, property)] },
      },
    },
    objects: {
      data: [{ properties: { mode: text("Dropdown") } }],
      header: [{
        properties: {
          show: bool(true),
          text: text(label),
          fontFamily: text("Segoe UI Semibold"),
          textSize: num(10),
          bold: bool(true),
          fontColor: fill(palette.muted),
          background: fill(palette.surface),
        },
      }],
      items: [{
        properties: {
          fontFamily: text("Segoe UI"),
          textSize: num(10),
          fontColor: fill(palette.ink),
          background: fill(palette.surface),
          padding: num(2),
        },
      }],
    },
    visualContainerObjects: {
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
          radius: num(12),
        },
      }],
      dropShadow: [{
        properties: {
          show: bool(true),
          preset: text("BottomRight"),
          color: fill("#9AA8BA"),
          transparency: num(97),
          position: text("Outer"),
        },
      }],
      visualHeader: [{ properties: { show: bool(false) } }],
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

const card = ({
  id,
  position,
  entity,
  measureName,
  label,
  color,
}) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "cardVisual",
    query: {
      queryState: {
        Data: { projections: [measure(entity, measureName)] },
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
          labelPrecision: num(measureName.includes("%") ? 1 : 0, "L"),
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
      ...panel(null, 0),
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

const bar = ({
  id,
  position,
  titleValue,
  entity,
  category,
  measureName,
  color,
  tint,
  percent = false,
  margin = 38,
  padding = 12,
  categoryColors = null,
}) => {
  const scopeSelector = (value) => ({
    data: [{
      scopeId: {
        Comparison: {
          ComparisonKind: 0,
          Left: {
            Column: {
              Expression: { SourceRef: { Entity: entity } },
              Property: category,
            },
          },
          Right: { Literal: { Value: `'${String(value).replaceAll("'", "''")}'` } },
        },
      },
    }],
  });

  const dataPoint = categoryColors
    ? [
        {
          properties: {
            defaultColor: fill(color),
            borderShow: bool(false),
          },
        },
        ...Object.entries(categoryColors).map(([value, categoryColor]) => ({
          properties: {
            fill: fill(categoryColor),
            borderShow: bool(false),
          },
          selector: scopeSelector(value),
        })),
      ]
    : [{
        properties: {
          fill: {
            solid: {
              color: {
                expr: {
                  FillRule: {
                    Input: measureExpr(entity, measureName),
                    FillRule: {
                      linearGradient2: {
                        min: { color: { Literal: { Value: `'${tint}'` } } },
                        max: { color: { Literal: { Value: `'${color}'` } } },
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
          borderShow: bool(false),
        },
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] },
      }];

  return ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "barChart",
    query: {
      queryState: {
        Category: { projections: [column(entity, category, true)] },
        Y: { projections: [measure(entity, measureName)] },
      },
      sortDefinition: {
        sort: [{
          field: measureExpr(entity, measureName),
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
          fontSize: num(10),
          labelColor: fill(palette.muted),
          innerPadding: num(26, "L"),
          maxMarginFactor: num(margin, "L"),
          showAxisTitle: bool(false),
          gridlineShow: bool(false),
        },
      }],
      valueAxis: [{
        properties: {
          show: bool(false),
          start: num(0),
          gridlineShow: bool(false),
          showAxisTitle: bool(false),
        },
      }],
      labels: [{
        properties: {
          show: bool(true),
          labelPosition: text("OutsideEnd"),
          optimizeLabelDisplay: bool(true),
          labelOverflow: bool(true),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(10),
          color: fill(palette.ink),
          labelDisplayUnits: text("0"),
          labelPrecision: num(percent ? 1 : 0, "L"),
        },
      }],
      legend: [{ properties: { show: bool(false) } }],
      dataPoint,
    },
    visualContainerObjects: panel(titleValue, padding),
  },
  });
};

const matrix = ({
  id,
  position,
  titleValue,
  rows,
  values,
  percentRef,
  sortEntity,
  sortMeasure,
}) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "pivotTable",
    query: {
      queryState: {
        Rows: { projections: rows.map(([entity, property]) => column(entity, property)) },
        Values: { projections: values.map(([entity, property]) => measure(entity, property)) },
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
          fontSize: num(10),
          bold: bool(true),
          alignment: text("Right"),
          wordWrap: bool(true),
          showExpandCollapseButtons: bool(true),
          expandCollapseButtonsColor: fill(palette.cyan),
        },
      }],
      rowHeaders: [{
        properties: {
          fontFamily: text("Segoe UI"),
          fontSize: num(10),
          fontColor: fill(palette.ink),
          backColor: fill(palette.surface),
          stepped: bool(true),
          steppedLayoutIndentation: num(14),
          wordWrap: bool(false),
          showExpandCollapseButtons: bool(true),
          expandCollapseButtonsColor: fill(palette.cyan),
        },
      }],
      values: [
        {
          properties: {
            fontFamily: text("Segoe UI"),
            fontSize: num(10),
            fontColorPrimary: fill(palette.ink),
            fontColorSecondary: fill(palette.ink),
            backColorPrimary: fill(palette.surface),
            backColorSecondary: fill("#F8FAFC"),
            bandedRowHeaders: bool(true),
          },
        },
        {
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
        },
      ],
      rowTotal: [{
        properties: {
          fontColor: fill(palette.ink),
          backColor: fill(palette.cyanTint),
          bold: bool(true),
        },
      }],
      columnTotal: [{
        properties: {
          fontColor: fill(palette.ink),
          backColor: fill(palette.cyanTint),
          bold: bool(true),
        },
      }],
    },
    visualContainerObjects: {
      ...panel(titleValue, 10),
      stylePreset: [{ properties: { name: text("None") } }],
    },
  },
});

const setPage = (pageId, displayName) => {
  const pageFile = path.join(pagesRoot, pageId, "page.json");
  const page = JSON.parse(fs.readFileSync(pageFile, "utf8"));
  page.displayName = displayName;
  page.displayOption = "FitToPage";
  page.height = 1080;
  page.width = 1920;
  page.objects = {
    background: [{
      properties: {
        color: fill(palette.canvas),
        transparency: num(0),
      },
    }],
  };
  writeJson(pageFile, page);
};

const brandParagraphs = [
  paragraph([
    textRun("TQT", { family: "Segoe UI Semibold", size: 22, weight: "600", color: palette.ink }),
    textRun("  Analytics", { family: "Segoe UI Semibold", size: 14, weight: "600", color: palette.cyan }),
  ]),
];

const filterParagraphs = [
  paragraph([textRun("BỘ LỌC", { family: "Segoe UI Semibold", size: 10, weight: "600", color: palette.muted })]),
];

const noteParagraphs = [
  paragraph([textRun("Phạm vi dữ liệu", { family: "Segoe UI Semibold", size: 11, weight: "600" })]),
  paragraph([textRun("Đồng Nai • HCM • Hồ Tràm", { size: 10, color: palette.muted })]),
  paragraph([textRun("Slicer trên rail chỉ tác động trong trang hiện tại.", { size: 9, color: palette.muted })]),
];

const sourceChrome = {
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
      radius: num(12),
    },
  }],
  dropShadow: [{
    properties: {
      show: bool(true),
      preset: text("BottomRight"),
      color: fill("#9AA8BA"),
      transparency: num(97),
      position: text("Outer"),
    },
  }],
  visualHeader: [{ properties: { show: bool(false) } }],
  padding: [{
    properties: {
      top: num(10),
      bottom: num(8),
      left: num(12),
      right: num(12),
    },
  }],
};

const writeRailCommon = (pageId, prefix, titleId, title, subtitle, source, fields) => {
  writeJson(
    visualPath(pageId, `${prefix}000000000000000001`),
    railShape(
      `${prefix}000000000000000001`,
      { x: 0, y: 0, z: 0, height: 1080, width: 264, tabOrder: 99 },
    ),
  );
  writeJson(
    visualPath(pageId, `${prefix}000000000000000002`),
    richTextbox(
      `${prefix}000000000000000002`,
      { x: 24, y: 28, z: 1000, height: 44, width: 216, tabOrder: 0 },
      brandParagraphs,
    ),
  );
  writeJson(
    visualPath(pageId, `${prefix}000000000000000003`),
    richTextbox(
      `${prefix}000000000000000003`,
      { x: 24, y: 104, z: 1000, height: 24, width: 216, tabOrder: 1 },
      filterParagraphs,
    ),
  );
  fields.forEach(([id, entity, property, label], index) => {
    writeJson(
      visualPath(pageId, id),
      slicer(
        id,
        { x: 24, y: 144 + index * 96, z: 1000, height: 80, width: 216, tabOrder: 2 + index },
        entity,
        property,
        label,
      ),
    );
  });
  writeJson(
    visualPath(pageId, `${prefix}000000000000000004`),
    richTextbox(
      `${prefix}000000000000000004`,
      { x: 24, y: 544, z: 1000, height: 112, width: 216, tabOrder: 6 },
      noteParagraphs,
    ),
  );
  writeJson(
    visualPath(pageId, titleId),
    richTextbox(
      titleId,
      { x: 296, y: 24, z: 1000, height: 64, width: 1048, tabOrder: 7 },
      [
        paragraph([textRun(title, { family: "Segoe UI Semibold", size: 25, weight: "600" })]),
        paragraph([textRun(subtitle, { size: 11, color: palette.muted })]),
      ],
    ),
  );
  writeJson(
    visualPath(pageId, `${prefix}000000000000000005`),
    richTextbox(
      `${prefix}000000000000000005`,
      { x: 1576, y: 28, z: 1000, height: 44, width: 312, tabOrder: 8 },
      [paragraph([textRun(source, { size: 10, color: palette.muted })], "center")],
      sourceChrome,
    ),
  );
};

setPage(page1, "Tổng quan quyết toán");
setPage(page2, "Phân công quyết toán theo PIC");

writeRailCommon(
  page1,
  "a1",
  "fd3619b3945134649638",
  "Dashboard Quyết Toán",
  "Bức tranh điều hành theo hợp đồng, khu vực, dự án và PIC",
  "Nguồn: SharePoint • Semantic model",
  [
    ["f8ed7790f3f96fbccc22", "Data", "Kỳ mục tiêu", "Kỳ mục tiêu"],
    ["d7a718a22bd895edcb88", "Data", "Khu vực chuẩn", "Khu vực"],
    ["a1000000000000000006", "Data", "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ", "Dự án / Đơn vị"],
    ["a1000000000000000007", "Data", "TÌNH TRẠNG QUYẾT TOÁN", "Tình trạng"],
  ],
);

writeJson(
  visualPath(page1, "391ab8b03678954b5ac4"),
  card({
    id: "391ab8b03678954b5ac4",
    position: { x: 296, y: 112, z: 1000, height: 152, width: 384, tabOrder: 9 },
    entity: "Data",
    measureName: "Số HĐ cần quyết toán",
    label: "Tổng hợp đồng",
    color: palette.cyan,
  }),
);
writeJson(
  visualPath(page1, "a1000000000000000008"),
  card({
    id: "a1000000000000000008",
    position: { x: 696, y: 112, z: 1000, height: 152, width: 384, tabOrder: 10 },
    entity: "Data",
    measureName: "Số HĐ hoàn thành",
    label: "Đã hoàn thành",
    color: palette.green,
  }),
);
writeJson(
  visualPath(page1, "a1000000000000000009"),
  card({
    id: "a1000000000000000009",
    position: { x: 1096, y: 112, z: 1000, height: 152, width: 384, tabOrder: 11 },
    entity: "Data",
    measureName: "Số HĐ cần quyết toán (năm nay)",
    label: "Mục tiêu năm nay",
    color: palette.orange,
  }),
);
writeJson(
  visualPath(page1, "a100000000000000000a"),
  card({
    id: "a100000000000000000a",
    position: { x: 1496, y: 112, z: 1000, height: 152, width: 384, tabOrder: 12 },
    entity: "Data",
    measureName: "% Hoàn thành",
    label: "Tỷ lệ hoàn thành",
    color: palette.teal,
  }),
);
writeJson(
  visualPath(page1, "6c01133a552db7acb6c8"),
  bar({
    id: "6c01133a552db7acb6c8",
    position: { x: 296, y: 288, z: 1000, height: 336, width: 776, tabOrder: 13 },
    titleValue: "PHÂN BỐ HỢP ĐỒNG THEO TÌNH TRẠNG",
    entity: "Data",
    category: "TÌNH TRẠNG QUYẾT TOÁN",
    measureName: "Số HĐ cần quyết toán",
    color: palette.chartNeutral,
    tint: palette.chartSlateTint,
    margin: 38,
    categoryColors: {
      "Đã quyết toán": palette.chartGreen,
      "Đã thanh lý": palette.chartGreen,
      "NT đang hoàn tất HSQT": palette.chartBlue,
      "NT chưa nộp HSQT": palette.chartOrange,
      "PAS đang kiểm": palette.chartSlate,
      "Hủy hợp đồng": palette.chartRed,
      "NT đã nộp(thất lạc HS)": palette.chartRed,
    },
  }),
);
writeJson(
  visualPath(page1, "a100000000000000000b"),
  bar({
    id: "a100000000000000000b",
    position: { x: 1088, y: 288, z: 1000, height: 336, width: 800, tabOrder: 14 },
    titleValue: "KHỐI LƯỢNG THEO KHU VỰC",
    entity: "Data",
    category: "Khu vực chuẩn",
    measureName: "Số HĐ cần quyết toán",
    color: palette.chartNeutral,
    tint: palette.chartBlueTint,
    margin: 30,
    categoryColors: {
      "HỒ TRÀM": palette.chartBlue,
      "ĐỒNG NAI": palette.chartCoral,
      "HCM": palette.chartGreen,
    },
  }),
);
writeJson(
  visualPath(page1, "53b0dfd78e779da94001"),
  bar({
    id: "53b0dfd78e779da94001",
    position: { x: 296, y: 640, z: 1000, height: 408, width: 504, tabOrder: 15 },
    titleValue: "DỰ ÁN / ĐƠN VỊ CÓ KHỐI LƯỢNG CAO",
    entity: "Data",
    category: "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ",
    measureName: "Số HĐ cần quyết toán",
    color: palette.chartBlue,
    tint: palette.chartBlueTint,
    margin: 44,
    padding: 10,
  }),
);
writeJson(
  visualPath(page1, "a100000000000000000c"),
  bar({
    id: "a100000000000000000c",
    position: { x: 816, y: 640, z: 1000, height: 408, width: 504, tabOrder: 16 },
    titleValue: "PIC CÓ NHIỀU LƯỢT PHÂN CÔNG",
    entity: "Phân công PIC",
    category: "PIC phụ trách",
    measureName: "Số lượt HĐ cần quyết toán",
    color: palette.chartOrange,
    tint: palette.chartOrangeTint,
    margin: 44,
    padding: 10,
  }),
);
writeJson(
  visualPath(page1, "493203045ab4b4ce6700"),
  bar({
    id: "493203045ab4b4ce6700",
    position: { x: 1336, y: 640, z: 1000, height: 408, width: 552, tabOrder: 17 },
    titleValue: "TỶ LỆ HOÀN THÀNH THEO KHU VỰC",
    entity: "Data",
    category: "Khu vực chuẩn",
    measureName: "% Hoàn thành",
    color: palette.chartNeutral,
    tint: palette.chartGreenTint,
    percent: true,
    margin: 34,
    padding: 10,
    categoryColors: {
      "HỒ TRÀM": palette.chartBlue,
      "ĐỒNG NAI": palette.chartCoral,
      "HCM": palette.chartGreen,
    },
  }),
);

writeRailCommon(
  page2,
  "a2",
  "8dbd3c7eaa512aee813c",
  "Phân Công Quyết Toán Theo PIC",
  "Theo dõi khối lượng, kết quả và tỷ lệ hoàn thành theo lượt phân công",
  "Đơn vị: lượt phân công",
  [
    ["1ba1c8569512a1bcd377", "Phân công PIC", "Kỳ mục tiêu", "Kỳ mục tiêu"],
    ["27f00a1dd3a94eb68e10", "Phân công PIC", "Nhóm PIC", "Nhóm PIC"],
    ["a2000000000000000006", "Phân công PIC", "Khu vực", "Khu vực"],
    ["a2000000000000000007", "Phân công PIC", "PIC phụ trách", "PIC phụ trách"],
  ],
);

writeJson(
  visualPath(page2, "3c6a3ac7623c8cf678f4"),
  bar({
    id: "3c6a3ac7623c8cf678f4",
    position: { x: 296, y: 112, z: 1000, height: 432, width: 1592, tabOrder: 9 },
    titleValue: "LƯỢT HỢP ĐỒNG CẦN QUYẾT TOÁN THEO PIC",
    entity: "Phân công PIC",
    category: "PIC phụ trách",
    measureName: "Số lượt HĐ cần quyết toán",
    color: palette.chartOrange,
    tint: palette.chartOrangeTint,
    margin: 30,
  }),
);
writeJson(
  visualPath(page2, "146945f73a4f1b0a942f"),
  matrix({
    id: "146945f73a4f1b0a942f",
    position: { x: 296, y: 568, z: 1000, height: 480, width: 1592, tabOrder: 10 },
    titleValue: "CHI TIẾT KPI THEO PIC",
    rows: [["Phân công PIC", "PIC phụ trách"]],
    values: [
      ["Phân công PIC", "Số lượt HĐ cần quyết toán"],
      ["Phân công PIC", "Số lượt HĐ cần quyết toán (năm nay)"],
      ["Phân công PIC", "Số lượt HĐ hoàn thành"],
      ["Phân công PIC", "% Hoàn thành PIC"],
    ],
    percentRef: "Phân công PIC.% Hoàn thành PIC",
    sortEntity: "Phân công PIC",
    sortMeasure: "Số lượt HĐ cần quyết toán",
  }),
);

const themeDir = path.join(root, "StaticResources", "RegisteredResources");
const previousThemePath = path.join(themeDir, previousThemeName);
const themePath = path.join(themeDir, themeName);
const theme = JSON.parse(fs.readFileSync(
  fs.existsSync(themePath) ? themePath : previousThemePath,
  "utf8",
));

theme.name = themeName;
theme.dataColors = [
  palette.cyan,
  palette.chartCoral,
  palette.green,
  palette.orange,
  palette.teal,
  palette.red,
  "#4F6D8A",
  "#5CB8E6",
  "#9A84E8",
  "#66C5A5",
  "#F1BD69",
];
theme.good = palette.green;
theme.neutral = palette.orange;
theme.bad = palette.red;
theme.maximum = palette.green;
theme.center = palette.orangeTint;
theme.minimum = palette.red;
theme.null = palette.muted;
theme.foreground = palette.ink;
theme.foregroundNeutralSecondary = palette.muted;
theme.foregroundNeutralTertiary = "#8794A7";
theme.background = palette.surface;
theme.backgroundLight = palette.canvas;
theme.backgroundNeutral = palette.surfaceAlt;
theme.tableAccent = palette.cyan;
theme.textClasses = {
  callout: { fontSize: 31, fontFace: "Segoe UI Semibold", color: palette.ink },
  title: { fontSize: 13, fontFace: "Segoe UI Semibold", color: palette.ink },
  header: { fontSize: 12, fontFace: "Segoe UI Semibold", color: palette.ink },
  label: { fontSize: 10, fontFace: "Segoe UI", color: palette.muted },
};
theme.visualStyles = {
  "*": {
    "*": {
      border: [{
        show: true,
        color: { solid: { color: palette.border } },
        width: 1,
        radius: 16,
      }],
      dropShadow: [{
        show: true,
        preset: "BottomRight",
        color: { solid: { color: "#9AA8BA" } },
        transparency: 96,
        position: "Outer",
      }],
      visualHeader: [{ show: false }],
      padding: [{ top: 10, bottom: 10, left: 10, right: 10 }],
    },
  },
  cardVisual: {
    "*": {
      value: [{ bold: true, $id: "default" }],
      label: [{ show: true, $id: "default" }],
      title: [{ show: false }],
    },
  },
  barChart: {
    "*": {
      labels: [{ show: true, fontSize: 10, color: { solid: { color: palette.ink } } }],
      valueAxis: [{ show: false, gridlineShow: false, showAxisTitle: false }],
      categoryAxis: [{
        show: true,
        fontSize: 10,
        labelColor: { solid: { color: palette.muted } },
        showAxisTitle: false,
        innerPadding: 26,
        gridlineShow: false,
      }],
      legend: [{ show: false }],
      dataPoint: [{ borderShow: false }],
    },
  },
  pivotTable: {
    "*": {
      columnHeaders: [{
        autoSizeColumnWidth: true,
        columnAdjustment: "growToFit",
        backColor: { solid: { color: palette.surfaceAlt } },
        fontColor: { solid: { color: palette.ink } },
        bold: true,
      }],
      values: [{
        backColorPrimary: { solid: { color: palette.surface } },
        backColorSecondary: { solid: { color: "#F8FAFC" } },
        fontColorPrimary: { solid: { color: palette.ink } },
        fontColorSecondary: { solid: { color: palette.ink } },
      }],
    },
  },
  slicer: {
    "*": {
      header: [{
        fontFamily: "Segoe UI Semibold",
        textSize: 10,
        fontColor: { solid: { color: palette.muted } },
        background: { solid: { color: palette.surface } },
        outlineStyle: 0,
      }],
      items: [{
        fontFamily: "Segoe UI",
        textSize: 10,
        fontColor: { solid: { color: palette.ink } },
        background: { solid: { color: palette.surface } },
        outlineStyle: 0,
        padding: 2,
      }],
    },
  },
  textbox: {
    "*": {
      padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
      background: [{ show: false }],
      border: [{ show: false }],
      dropShadow: [{ show: false }],
    },
  },
  shape: {
    "*": {
      border: [{ show: false }],
      dropShadow: [{ show: false }],
      padding: [{ top: 0, bottom: 0, left: 0, right: 0 }],
    },
  },
};
writeJson(themePath, theme);

const reportPath = path.join(definition, "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
report.themeCollection.customTheme.name = themeName;
const registered = report.resourcePackages.find((pkg) => pkg.name === "RegisteredResources");
registered.items = [{ name: themeName, path: themeName, type: "CustomTheme" }];
writeJson(reportPath, report);

console.log("Applied Light Analytics mockup styling to both report pages.");
