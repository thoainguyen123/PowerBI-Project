import fs from "node:fs";
import path from "node:path";

const root = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS\\DASHBOARD TQT.Report";
const definition = path.join(root, "definition");
const pagesRoot = path.join(definition, "pages");
const page1 = "5bd3737f4bb0549b9e5c";
const page2 = "bdeba8b7c925406c4124";
const schema = "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json";
const oldThemeName = "CorporateCool-ceb0debc.json";
const themeName = "MidnightOperations-72f4c1a9.json";

const palette = {
  canvas: "#061827",
  canvasRaised: "#0B2E4F",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F7FA",
  ink: "#102A43",
  muted: "#5B7083",
  border: "#D5E0E8",
  cyan: "#00A6B2",
  cyanTint: "#D9F5F7",
  green: "#16A34A",
  amber: "#F59E0B",
  red: "#DC2626",
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

const container = (titleValue, padding = 12) => {
  const vco = {
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
        show: bool(false),
        preset: text("BottomRight"),
        color: fill(palette.canvas),
        transparency: num(92),
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
    vco.title = [{
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
  return vco;
};

const slicerContainer = () => ({
  background: [{
    properties: {
      show: bool(true),
      color: fill(palette.canvasRaised),
      transparency: num(0),
    },
  }],
  border: [{
    properties: {
      show: bool(true),
      color: fill("#1E5A73"),
      width: num(1),
      radius: num(12),
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
});

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const visualPath = (pageId, visualId) =>
  path.join(pagesRoot, pageId, "visuals", visualId, "visual.json");

const textbox = (id, position, titleValue, subtitleValue) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "textbox",
    objects: {
      general: [{
        properties: {
          paragraphs: [
            {
              textRuns: [{
                value: titleValue,
                textStyle: {
                  fontFamily: "Segoe UI Semibold",
                  fontSize: "30px",
                  fontWeight: "600",
                  color: "#FFFFFF",
                },
              }],
              horizontalTextAlignment: "left",
            },
            {
              textRuns: [{
                value: subtitleValue,
                textStyle: {
                  fontFamily: "Segoe UI",
                  fontSize: "13px",
                  color: "#7DD3DA",
                },
              }],
              horizontalTextAlignment: "left",
            },
          ],
        },
      }],
    },
    visualContainerObjects: {
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
    },
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
          fontColor: fill("#FFFFFF"),
          background: fill(palette.canvasRaised),
        },
      }],
      items: [{
        properties: {
          fontFamily: text("Segoe UI"),
          textSize: num(10),
          fontColor: fill("#DCEAF0"),
          background: fill(palette.canvasRaised),
        },
      }],
    },
    visualContainerObjects: slicerContainer(),
  },
});

const card = (id, position) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "cardVisual",
    query: {
      queryState: {
        Data: {
          projections: [
            measure("Data", "Số HĐ cần quyết toán"),
            measure("Data", "Số HĐ cần quyết toán (năm nay)"),
            measure("Data", "Số HĐ hoàn thành"),
            measure("Data", "% Hoàn thành"),
          ],
        },
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
          fontSize: num(30),
          bold: bool(true),
          fontColor: fill(palette.ink),
          horizontalAlignment: text("left"),
          labelDisplayUnits: text("0"),
        },
        selector: { id: "default" },
      }],
      label: [{
        properties: {
          show: bool(true),
          fontFamily: text("Segoe UI"),
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
          paddingUniform: num(12, "L"),
          rectangleRoundedCurve: num(8, "L"),
          backgroundFillColor: fill(palette.surfaceAlt),
          backgroundTransparency: num(0),
        },
      }],
      accentBar: [{
        properties: {
          show: bool(true),
          position: text("Left"),
          width: num(4),
          color: fill(palette.cyan),
        },
        selector: { id: "default" },
      }],
      divider: [{
        properties: {
          show: bool(true),
          dividerWidth: num(1),
          dividerColor: fill(palette.border),
          dividerTransparency: num(0),
          dividerLineStyle: text("solid"),
          dividerIgnorePadding: bool(true),
        },
        selector: { id: "default" },
      }],
      layout: [{
        properties: {
          style: text("Table"),
          orientation: num(2),
          customizeLines: bool(true),
          gridlineWidth: num(1),
          gridlineColor: fill(palette.border),
          gridlineTransparency: num(0),
          gridlineStyle: text("solid"),
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
      ...container(null, 0),
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

const matrix = ({
  id,
  position,
  titleValue,
  rows,
  values,
  percentRef,
  sortEntity,
  sortMeasure,
  expandedValues = [],
}) => {
  const valueProjections = values.map(([entity, property]) => measure(entity, property));
  const visual = {
    visualType: "pivotTable",
    query: {
      queryState: {
        Rows: { projections: rows.map(([entity, property]) => column(entity, property)) },
        Values: { projections: valueProjections },
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
          backColor: fill(palette.canvasRaised),
          fontColor: fill("#FFFFFF"),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(10),
          bold: bool(true),
          alignment: text("Right"),
          wordWrap: bool(true),
          showExpandCollapseButtons: bool(true),
          expandCollapseButtonsColor: fill("#FFFFFF"),
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
            backColorSecondary: fill(palette.surfaceAlt),
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
                            color: { Literal: { Value: "'#FEE2E2'" } },
                            value: { Literal: { Value: "0D" } },
                          },
                          mid: {
                            color: { Literal: { Value: "'#FEF3C7'" } },
                            value: { Literal: { Value: "0.5D" } },
                          },
                          max: {
                            color: { Literal: { Value: "'#DCFCE7'" } },
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
      ...container(titleValue, 10),
      stylePreset: [{
        properties: { name: text("None") },
      }],
    },
  };
  if (expandedValues.length && rows.length > 1) {
    visual.expansionStates = [{
      roles: ["Rows"],
      levels: [
        {
          queryRefs: [`${rows[0][0]}.${rows[0][1]}`],
          isCollapsed: true,
          identityKeys: [{
            Column: {
              Expression: { SourceRef: { Entity: rows[0][0] } },
              Property: rows[0][1],
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
        children: expandedValues.map((value) => ({
          identityValues: [{
            Literal: { Value: `'${String(value).replaceAll("'", "''")}'` },
          }],
          isToggled: true,
        })),
      },
    }];
  }
  return { $schema: schema, name: id, position, visual };
};

const flatTable = ({
  id,
  position,
  titleValue,
  columns,
  values,
  percentRef,
  sortEntity,
  sortMeasure,
}) => ({
  $schema: schema,
  name: id,
  position,
  visual: {
    visualType: "tableEx",
    query: {
      queryState: {
        Values: {
          projections: [
            ...columns.map(([entity, property]) => column(entity, property)),
            ...values.map(([entity, property]) => measure(entity, property)),
          ],
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
          backColor: fill(palette.canvasRaised),
          fontColor: fill("#FFFFFF"),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: num(10),
          bold: bool(true),
          alignment: text("Auto"),
          wordWrap: bool(true),
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
            backColorSecondary: fill(palette.surfaceAlt),
            wordWrap: bool(false),
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
                            color: { Literal: { Value: "'#FEE2E2'" } },
                            value: { Literal: { Value: "0D" } },
                          },
                          mid: {
                            color: { Literal: { Value: "'#FEF3C7'" } },
                            value: { Literal: { Value: "0.5D" } },
                          },
                          max: {
                            color: { Literal: { Value: "'#DCFCE7'" } },
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
      total: [{
        properties: {
          totals: bool(true),
          label: text("Tổng"),
          fontColor: fill(palette.ink),
          backColor: fill(palette.cyanTint),
          bold: bool(true),
        },
      }],
    },
    visualContainerObjects: {
      ...container(titleValue, 10),
      stylePreset: [{
        properties: { name: text("None") },
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
  gradient,
  percent = false,
}) => {
  const yProjection = measure(entity, measureName);
  const dataPoint = gradient
    ? [{
        properties: {
          fill: {
            solid: {
              color: {
                expr: {
                  FillRule: {
                    Input: measureExpr(entity, measureName),
                    FillRule: {
                      linearGradient2: {
                        min: { color: { Literal: { Value: "'#99E5EA'" } } },
                        max: { color: { Literal: { Value: "'#007B86'" } } },
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
        selector: { data: [{ dataViewWildcard: { matchingOption: 0 } }] },
      }]
    : [{ properties: { fill: fill(color), borderShow: bool(false) } }];

  return {
    $schema: schema,
    name: id,
    position,
    visual: {
      visualType: "barChart",
      query: {
        queryState: {
          Category: { projections: [column(entity, category, true)] },
          Y: { projections: [yProjection] },
        },
        sortDefinition: {
          sort: [{ field: measureExpr(entity, measureName), direction: "Descending" }],
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
            innerPadding: num(24, "L"),
            maxMarginFactor: num(34, "L"),
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
      visualContainerObjects: container(titleValue, 12),
    },
  };
};

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

setPage(page1, "Tổng quan quyết toán");
setPage(page2, "Phân công quyết toán theo PIC");

writeJson(
  visualPath(page1, "fd3619b3945134649638"),
  textbox(
    "fd3619b3945134649638",
    { x: 32, y: 24, z: 1000, height: 72, width: 888, tabOrder: 0 },
    "ĐIỀU HÀNH QUYẾT TOÁN — 3 KHU VỰC",
    "Đồng Nai • HCM • Hồ Tràm  |  KPI nguồn + kế hoạch mục tiêu Hồ Tràm",
  ),
);
writeJson(
  visualPath(page1, "f8ed7790f3f96fbccc22"),
  slicer(
    "f8ed7790f3f96fbccc22",
    { x: 976, y: 16, z: 1000, height: 80, width: 440, tabOrder: 1 },
    "Data",
    "Kỳ mục tiêu",
    "Kỳ mục tiêu",
  ),
);
writeJson(
  visualPath(page1, "d7a718a22bd895edcb88"),
  slicer(
    "d7a718a22bd895edcb88",
    { x: 1440, y: 16, z: 1000, height: 80, width: 448, tabOrder: 2 },
    "Data",
    "Khu vực chuẩn",
    "Khu vực",
  ),
);
writeJson(
  visualPath(page1, "391ab8b03678954b5ac4"),
  card(
    "391ab8b03678954b5ac4",
    { x: 32, y: 120, z: 1000, height: 168, width: 1856, tabOrder: 3 },
  ),
);
writeJson(
  visualPath(page1, "53b0dfd78e779da94001"),
  flatTable({
    id: "53b0dfd78e779da94001",
    position: { x: 32, y: 312, z: 1000, height: 736, width: 1184, tabOrder: 4 },
    titleValue: "TIẾN ĐỘ THEO KHU VỰC VÀ DỰ ÁN",
    columns: [
      ["Data", "Khu vực chuẩn"],
      ["Data", "TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ"],
    ],
    values: [
      ["Data", "Số HĐ cần quyết toán"],
      ["Data", "Số HĐ cần quyết toán (năm nay)"],
      ["Data", "Số HĐ hoàn thành"],
      ["Data", "% Hoàn thành"],
    ],
    percentRef: "Data.% Hoàn thành",
    sortEntity: "Data",
    sortMeasure: "Số HĐ cần quyết toán",
  }),
);
writeJson(
  visualPath(page1, "493203045ab4b4ce6700"),
  bar({
    id: "493203045ab4b4ce6700",
    position: { x: 1240, y: 312, z: 1000, height: 352, width: 648, tabOrder: 5 },
    titleValue: "TỶ LỆ HOÀN THÀNH THEO KHU VỰC",
    entity: "Data",
    category: "Khu vực chuẩn",
    measureName: "% Hoàn thành",
    color: palette.green,
    percent: true,
  }),
);
writeJson(
  visualPath(page1, "6c01133a552db7acb6c8"),
  bar({
    id: "6c01133a552db7acb6c8",
    position: { x: 1240, y: 688, z: 1000, height: 360, width: 648, tabOrder: 6 },
    titleValue: "HỢP ĐỒNG THEO TÌNH TRẠNG QUYẾT TOÁN",
    entity: "Data",
    category: "TÌNH TRẠNG QUYẾT TOÁN",
    measureName: "Số HĐ cần quyết toán",
    color: palette.canvasRaised,
  }),
);

writeJson(
  visualPath(page2, "8dbd3c7eaa512aee813c"),
  textbox(
    "8dbd3c7eaa512aee813c",
    { x: 32, y: 24, z: 1000, height: 72, width: 912, tabOrder: 0 },
    "NĂNG LỰC & KHỐI LƯỢNG THEO PIC",
    "Một hợp đồng có hai vai trò PIC được tính thành hai lượt phân công",
  ),
);
writeJson(
  visualPath(page2, "1ba1c8569512a1bcd377"),
  slicer(
    "1ba1c8569512a1bcd377",
    { x: 1000, y: 16, z: 1000, height: 80, width: 416, tabOrder: 1 },
    "Phân công PIC",
    "Kỳ mục tiêu",
    "Kỳ mục tiêu",
  ),
);
writeJson(
  visualPath(page2, "27f00a1dd3a94eb68e10"),
  slicer(
    "27f00a1dd3a94eb68e10",
    { x: 1440, y: 16, z: 1000, height: 80, width: 448, tabOrder: 2 },
    "Phân công PIC",
    "Nhóm PIC",
    "Nhóm PIC",
  ),
);
writeJson(
  visualPath(page2, "3c6a3ac7623c8cf678f4"),
  bar({
    id: "3c6a3ac7623c8cf678f4",
    position: { x: 32, y: 120, z: 1000, height: 430, width: 1856, tabOrder: 3 },
    titleValue: "LƯỢT HĐ CẦN QUYẾT TOÁN THEO PIC",
    entity: "Phân công PIC",
    category: "PIC phụ trách",
    measureName: "Số lượt HĐ cần quyết toán",
    gradient: true,
  }),
);
writeJson(
  visualPath(page2, "146945f73a4f1b0a942f"),
  matrix({
    id: "146945f73a4f1b0a942f",
    position: { x: 32, y: 574, z: 1000, height: 474, width: 1856, tabOrder: 4 },
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
const oldThemePath = path.join(themeDir, oldThemeName);
const themePath = path.join(themeDir, themeName);
const theme = JSON.parse(fs.readFileSync(fs.existsSync(themePath) ? themePath : oldThemePath, "utf8"));
theme.name = themeName;
theme.dataColors = [
  palette.cyan,
  palette.canvasRaised,
  palette.green,
  palette.amber,
  palette.red,
  "#526D82",
  "#22D3EE",
  "#86EFAC",
  "#FDBA74",
  "#CBD5E1",
];
theme.good = palette.green;
theme.neutral = palette.amber;
theme.bad = palette.red;
theme.maximum = palette.green;
theme.center = "#FEF3C7";
theme.minimum = palette.red;
theme.null = palette.muted;
theme.foreground = palette.ink;
theme.foregroundNeutralSecondary = palette.muted;
theme.foregroundNeutralTertiary = "#71879A";
theme.background = palette.surface;
theme.backgroundLight = palette.surfaceAlt;
theme.backgroundNeutral = palette.cyanTint;
theme.tableAccent = palette.cyan;
theme.textClasses = {
  callout: { fontSize: 30, fontFace: "Segoe UI Semibold", color: palette.ink },
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
        radius: 12,
      }],
      dropShadow: [{
        show: false,
        preset: "BottomRight",
        color: { solid: { color: palette.canvas } },
        transparency: 96,
        position: "Outer",
      }],
      visualHeader: [{ show: false }],
      padding: [{ top: 10, bottom: 10, left: 10, right: 10 }],
    },
  },
  pivotTable: {
    "*": {
      columnHeaders: [{
        autoSizeColumnWidth: true,
        columnAdjustment: "growToFit",
        backColor: { solid: { color: palette.canvasRaised } },
        fontColor: { solid: { color: "#FFFFFF" } },
        bold: true,
      }],
      values: [{
        backColorPrimary: { solid: { color: palette.surface } },
        backColorSecondary: { solid: { color: palette.surfaceAlt } },
        fontColorPrimary: { solid: { color: palette.ink } },
        fontColorSecondary: { solid: { color: palette.ink } },
      }],
    },
  },
  tableEx: {
    "*": {
      columnHeaders: [{
        autoSizeColumnWidth: true,
        columnAdjustment: "growToFit",
        backColor: { solid: { color: palette.canvasRaised } },
        fontColor: { solid: { color: "#FFFFFF" } },
        bold: true,
      }],
    },
  },
  cardVisual: {
    "*": {
      value: [{ bold: true, fontColor: { solid: { color: palette.ink } }, $id: "default" }],
      label: [{ show: true, fontColor: { solid: { color: palette.muted } }, $id: "default" }],
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
        innerPadding: 24,
        gridlineShow: false,
      }],
      legend: [{ show: false }],
      dataPoint: [{ borderShow: false }],
    },
  },
  slicer: {
    "*": {
      header: [{
        fontFamily: "Segoe UI Semibold",
        textSize: 10,
        fontColor: { solid: { color: "#FFFFFF" } },
        background: { solid: { color: palette.canvasRaised } },
        outlineStyle: 0,
      }],
      items: [{
        fontFamily: "Segoe UI",
        textSize: 10,
        fontColor: { solid: { color: "#DCEAF0" } },
        background: { solid: { color: palette.canvasRaised } },
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

console.log("Redesigned 2 pages, 12 visuals, and registered Midnight Operations theme.");
