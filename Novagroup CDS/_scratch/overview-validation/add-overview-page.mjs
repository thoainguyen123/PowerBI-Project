import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const reportRoot = path.join(projectRoot, "Novagroup CDS.Report");
const pagesRoot = path.join(reportRoot, "definition", "pages");

const MAIN_PAGE = "8835187e53de26de86d4";
const OVERVIEW_PAGE = "0a11ce00000000000001";
const VISUAL_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.11.0/schema.json";
const PAGE_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json";

const IDS = {
  title: "0a11ce10000000000001",
  slicer: "0a11ce10000000000002",
  navigation: "0a11ce10000000000003",
  progress: "0a11ce10000000000004",
  total: "0a11ce10000000000005",
  inProgress: "0a11ce10000000000006",
  overdue: "0a11ce10000000000007",
  completed: "0a11ce10000000000008",
  statusChart: "0a11ce10000000000009",
  levelChart: "0a11ce1000000000000a",
  overdueTable: "0a11ce1000000000000b",
  footer: "0a11ce1000000000000c",
};

const C = {
  canvas: "#F4F7FB",
  surface: "#FFFFFF",
  navy: "#0F2B46",
  navy2: "#0F4C81",
  blue: "#2F80ED",
  cyan: "#27B3C5",
  text: "#102A43",
  muted: "#5B7083",
  border: "#D7E2EC",
  grid: "#E8EEF5",
  success: "#16865A",
  danger: "#D64554",
};

const fontBody = "Segoe UI";
const fontStrong = "Segoe UI Semibold";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function bool(value) {
  return literal(value ? "true" : "false");
}

function num(value, suffix = "D") {
  return literal(`${value}${suffix}`);
}

function str(value) {
  return literal(`'${String(value).replaceAll("'", "''")}'`);
}

function fill(value) {
  return { solid: { color: str(value) } };
}

function position(x, y, width, height, order) {
  return { x, y, z: order, height, width, tabOrder: order };
}

function selectorDefault() {
  return { id: "default" };
}

function columnField(entity, property) {
  return {
    Column: {
      Expression: { SourceRef: { Entity: entity } },
      Property: property,
    },
  };
}

function measureField(entity, property) {
  return {
    Measure: {
      Expression: { SourceRef: { Entity: entity } },
      Property: property,
    },
  };
}

function aggregationField(entity, property, fn) {
  return {
    Aggregation: {
      Expression: { Column: columnField(entity, property).Column },
      Function: fn,
    },
  };
}

function projection(field, queryRef, nativeQueryRef, displayName, format) {
  const value = { field, queryRef, nativeQueryRef, displayName };
  if (format) value.format = format;
  return value;
}

function filterName(index) {
  return `Filter${index.toString(16).padStart(24, "0")}`;
}

function categoricalFilter(index, entity, property, values, alias = "p") {
  return {
    name: filterName(0xa11ce0 + index),
    field: columnField(entity, property),
    type: "Categorical",
    filter: {
      Version: 2,
      From: [{ Name: alias, Entity: entity, Type: 0 }],
      Where: [
        {
          Condition: {
            In: {
              Expressions: [
                {
                  Column: {
                    Expression: { SourceRef: { Source: alias } },
                    Property: property,
                  },
                },
              ],
              Values: values.map((value) => [
                { Literal: { Value: `'${String(value).replaceAll("'", "''")}'` } },
              ]),
            },
          },
        },
      ],
    },
    howCreated: "User",
  };
}

function filterConfig(...filters) {
  return { filters };
}

function commonVco({
  title = null,
  altText = null,
  background = C.surface,
  border = true,
  radius = 12,
  padding = 0,
} = {}) {
  const result = {
    background: [
      {
        properties: {
          show: bool(background !== null),
          color: fill(background ?? C.surface),
          transparency: num(0),
        },
      },
    ],
    border: [
      {
        properties: {
          show: bool(border),
          color: fill(C.border),
          radius: num(radius),
          width: num(1),
        },
      },
    ],
    padding: [
      {
        properties: {
          top: num(padding),
          bottom: num(padding),
          left: num(padding),
          right: num(padding),
        },
      },
    ],
    visualHeader: [{ properties: { show: bool(false) } }],
  };
  if (title !== null) {
    result.title = [
      {
        properties: {
          show: bool(true),
          text: str(title),
          titleWrap: bool(true),
          fontFamily: str(fontStrong),
          fontSize: num(13),
          bold: bool(true),
          fontColor: fill(C.navy),
          background: fill(C.surface),
          alignment: str("left"),
          heading: str("Heading2"),
        },
      },
    ];
  } else {
    result.title = [{ properties: { show: bool(false) } }];
  }
  if (altText !== null) {
    result.general = [{ properties: { altText: str(altText) } }];
  }
  return result;
}

function writeVisual(id, doc) {
  if (!/^[a-f0-9]{20}$/.test(id)) {
    throw new Error(`Visual id must be exactly 20 lowercase hex characters: ${id}`);
  }
  const file = path.join(pagesRoot, OVERVIEW_PAGE, "visuals", id, "visual.json");
  writeJson(file, { $schema: VISUAL_SCHEMA, name: id, ...doc });
}

function makeTextbox(id, pos, paragraphs, altText = null) {
  writeVisual(id, {
    position: pos,
    visual: {
      visualType: "textbox",
      objects: { general: [{ properties: { paragraphs } }] },
      visualContainerObjects: commonVco({
        background: null,
        border: false,
        altText,
      }),
      drillFilterOtherVisuals: true,
    },
  });
}

function textRun(value, fontSize, color, bold = false) {
  return {
    value,
    textStyle: {
      fontFamily: bold ? fontStrong : fontBody,
      fontSize: `${fontSize}pt`,
      color,
      ...(bold ? { fontWeight: "bold" } : {}),
    },
  };
}

function makeCard({
  id,
  pos,
  field,
  queryRef,
  nativeQueryRef,
  displayName,
  label,
  accent,
  valueSize = 30,
  valueColor = accent,
  filter = null,
  altText,
}) {
  const doc = {
    position: pos,
    visual: {
      visualType: "cardVisual",
      query: {
        queryState: {
          Data: {
            projections: [
              projection(field, queryRef, nativeQueryRef, displayName),
            ],
          },
        },
        sortDefinition: { isDefaultSort: true },
      },
      objects: {
        value: [
          {
            properties: {
              show: bool(true),
              fontFamily: str(fontStrong),
              fontSize: num(valueSize),
              bold: bool(true),
              fontColor: fill(valueColor),
              horizontalAlignment: str("center"),
              textWrap: bool(true),
            },
            selector: selectorDefault(),
          },
        ],
        label: [
          {
            properties: {
              show: bool(true),
              text: str(label),
              position: str("aboveValue"),
              fontFamily: str(fontStrong),
              fontSize: num(10),
              bold: bool(true),
              fontColor: fill(C.muted),
              horizontalAlignment: str("center"),
              textWrap: bool(true),
            },
            selector: selectorDefault(),
          },
        ],
        accentBar: [
          {
            properties: {
              show: bool(true),
              position: str("Left"),
              color: fill(accent),
              transparency: num(0),
              width: num(5),
            },
            selector: selectorDefault(),
          },
        ],
        outline: [
          {
            properties: { show: bool(false) },
            selector: selectorDefault(),
          },
        ],
        layout: [
          {
            properties: {
              leftOuterMargin: num(0, "L"),
              rightOuterMargin: num(0, "L"),
              topOuterMargin: num(0, "L"),
              bottomOuterMargin: num(0, "L"),
              paddingUniform: num(0, "L"),
              style: str("Cards"),
            },
            selector: selectorDefault(),
          },
        ],
        padding: [
          {
            properties: {
              paddingSelection: str("Custom"),
              leftMargin: num(12, "L"),
              rightMargin: num(8, "L"),
              topMargin: num(0, "L"),
              bottomMargin: num(0, "L"),
            },
            selector: selectorDefault(),
          },
        ],
        cardCalloutArea: [
          {
            properties: { paddingUniform: num(0, "L") },
            selector: selectorDefault(),
          },
        ],
      },
      visualContainerObjects: commonVco({ altText, padding: 0 }),
      drillFilterOtherVisuals: true,
    },
  };
  if (filter) doc.filterConfig = filterConfig(filter);
  writeVisual(id, doc);
}

function makeBarChart({
  id,
  pos,
  title,
  categoryProperty,
  measureProperty,
  measureFunction,
  measureQueryRef,
  measureNativeRef,
  measureDisplayName,
  measureFormat = null,
  color,
  sort,
  filter = null,
  percent = false,
  altText,
}) {
  const yField = aggregationField("Project", measureProperty, measureFunction);
  const doc = {
    position: pos,
    visual: {
      visualType: "barChart",
      query: {
        queryState: {
          Category: {
            projections: [
              projection(
                columnField("Project", categoryProperty),
                `Project.${categoryProperty}`,
                categoryProperty,
                categoryProperty === "status" ? "Trạng thái" : "Cấp công việc",
              ),
            ],
          },
          Y: {
            projections: [
              projection(
                yField,
                measureQueryRef,
                measureNativeRef,
                measureDisplayName,
                measureFormat,
              ),
            ],
          },
        },
        sortDefinition: {
          sort: [
            {
              field:
                sort === "value"
                  ? yField
                  : columnField("Project", categoryProperty),
              direction: sort === "value" ? "Descending" : "Ascending",
            },
          ],
        },
      },
      objects: {
        dataPoint: [
          {
            properties: {
              defaultColor: fill(color),
              fillTransparency: num(0),
              borderShow: bool(false),
            },
          },
        ],
        labels: [
          {
            properties: {
              show: bool(true),
              labelPosition: str("OutsideEnd"),
              fontFamily: str(fontStrong),
              fontSize: num(10),
              bold: bool(true),
              color: fill(C.text),
              labelDisplayUnits: num(1),
              labelPrecision: num(0, "L"),
              ...(percent
                ? { valueCustomFormatString: str("0%") }
                : {}),
            },
          },
        ],
        legend: [{ properties: { show: bool(false) } }],
        categoryAxis: [
          {
            properties: {
              show: bool(true),
              axisType: str("Categorical"),
              innerPadding: num(32, "L"),
              fontFamily: str(fontBody),
              fontSize: num(10),
              labelColor: fill(C.text),
              showAxisTitle: bool(false),
              gridlineShow: bool(false),
            },
          },
        ],
        valueAxis: [
          {
            properties: {
              show: bool(true),
              start: num(0),
              fontFamily: str(fontBody),
              fontSize: num(9),
              labelColor: fill(C.muted),
              labelDisplayUnits: num(1),
              labelPrecision: num(0, "L"),
              showAxisTitle: bool(false),
              gridlineShow: bool(true),
              gridlineColor: fill(C.grid),
              gridlineThickness: num(1),
              gridlineStyle: str("dotted"),
            },
          },
        ],
      },
      visualContainerObjects: commonVco({
        title,
        altText,
        padding: 8,
      }),
      drillFilterOtherVisuals: true,
    },
  };
  if (filter) doc.filterConfig = filterConfig(filter);
  writeVisual(id, doc);
}

function makeTable() {
  const averagePercent = aggregationField("Project", "percent", 1);
  const doc = {
    position: position(32, 800, 1336, 704, 11000),
    visual: {
      visualType: "tableEx",
      query: {
        queryState: {
          Values: {
            projections: [
              projection(
                columnField("Project", "title"),
                "Project.title",
                "title",
                "Công việc",
              ),
              projection(
                columnField("Project", "end_plan"),
                "Project.end_plan",
                "end_plan",
                "Ngày kết thúc",
              ),
              projection(
                averagePercent,
                "Sum(Project.percent)",
                "Average of percent",
                "Tiến độ",
                "0%",
              ),
              projection(
                columnField("Project", "status"),
                "Project.status",
                "status",
                "Trạng thái",
              ),
            ],
          },
        },
        sortDefinition: {
          sort: [{ field: averagePercent, direction: "Ascending" }],
        },
      },
      objects: {
        columnHeaders: [
          {
            properties: {
              fontFamily: str(fontStrong),
              fontSize: num(10),
              bold: bool(true),
              fontColor: fill(C.surface),
              backColor: fill(C.navy2),
              autoSizeColumnWidth: bool(true),
              columnAdjustment: str("growToFit"),
              wordWrap: bool(true),
              outlineColor: fill(C.border),
              outlineWeight: num(1),
              alignment: str("Left"),
            },
          },
        ],
        values: [
          {
            properties: {
              fontFamily: str(fontBody),
              fontSize: num(10),
              fontColorPrimary: fill(C.text),
              fontColorSecondary: fill(C.text),
              backColorPrimary: fill(C.surface),
              backColorSecondary: fill("#F7FAFC"),
              wordWrap: bool(true),
            },
          },
        ],
        grid: [
          {
            properties: {
              gridHorizontal: bool(true),
              gridHorizontalColor: fill(C.border),
              gridHorizontalWeight: num(1),
              gridVertical: bool(false),
              gridVerticalColor: fill(C.border),
              rowPadding: num(7),
              outlineColor: fill(C.border),
              outlineWeight: num(1),
            },
          },
        ],
        total: [{ properties: { totals: bool(false) } }],
        columnFormatting: [
          {
            properties: {
              dataBars: {
                positiveColor: fill(C.cyan),
                negativeColor: fill(C.danger),
                axisColor: fill(C.muted),
                reverseDirection: bool(false),
                hideText: bool(false),
                totalMatchingOption: num(1, "L"),
              },
            },
            selector: { metadata: "Sum(Project.percent)" },
          },
        ],
      },
      visualContainerObjects: commonVco({
        title: "Công việc quá hạn cần rà soát",
        altText:
          "Danh sách công việc quá hạn, sắp xếp tiến độ thấp lên trước để ưu tiên rà soát.",
        padding: 0,
      }),
      drillFilterOtherVisuals: true,
    },
    filterConfig: filterConfig(
      categoricalFilter(5, "Project", "is_overdue_task", ["Có"]),
    ),
  };
  writeVisual(IDS.overdueTable, doc);
}

function makeSlicer() {
  writeVisual(IDS.slicer, {
    position: position(928, 32, 240, 80, 2000),
    visual: {
      visualType: "slicer",
      query: {
        queryState: {
          Values: {
            projections: [
              {
                ...projection(
                  columnField("Project", "tag_ids"),
                  "Project.tag_ids",
                  "tag_ids",
                  "Chọn tag",
                ),
                active: true,
              },
            ],
          },
        },
      },
      objects: {
        data: [{ properties: { mode: str("Dropdown") } }],
        header: [
          {
            properties: {
              show: bool(true),
              text: str("Chọn tag"),
              fontFamily: str(fontStrong),
              textSize: num(10),
              bold: bool(true),
              fontColor: fill(C.navy),
              background: fill(C.surface),
              showRestatement: bool(true),
            },
          },
        ],
        items: [
          {
            properties: {
              fontFamily: str(fontBody),
              textSize: num(10),
              fontColor: fill(C.text),
              background: fill(C.surface),
            },
          },
        ],
      },
      visualContainerObjects: commonVco({
        altText: "Bộ lọc tag áp dụng cho toàn bộ trang tổng quan.",
        padding: 8,
      }),
      drillFilterOtherVisuals: true,
    },
  });
}

function makeNavigation() {
  writeVisual(IDS.navigation, {
    position: position(1184, 32, 184, 80, 3000),
    visual: {
      visualType: "shape",
      objects: {
        shape: [
          {
            properties: {
              tileShape: str("rectangleRounded"),
              rectangleRoundedCurve: num(16, "L"),
            },
          },
        ],
        rotation: [
          {
            properties: {
              shapeAngle: num(0, "L"),
            },
          },
        ],
        fill: [
          {
            properties: {
              show: bool(true),
              fillColor: fill(C.blue),
              transparency: num(0),
            },
            selector: selectorDefault(),
          },
        ],
        outline: [
          {
            properties: { show: bool(false) },
            selector: selectorDefault(),
          },
        ],
        text: [
          {
            properties: {
              show: bool(true),
            },
          },
          {
            properties: {
              text: str("Bản đồ CDS"),
              fontFamily: str(fontStrong),
              fontSize: num(11),
              bold: bool(true),
              fontColor: fill(C.surface),
              horizontalAlignment: str("center"),
              verticalAlignment: str("middle"),
            },
            selector: selectorDefault(),
          },
        ],
      },
      visualContainerObjects: {
        ...commonVco({
          background: null,
          border: false,
          altText: "Mở trang bản đồ CDS theo đơn vị.",
          padding: 0,
        }),
        visualLink: [
          {
            properties: {
              show: bool(true),
              type: str("PageNavigation"),
              navigationSection: str(MAIN_PAGE),
            },
          },
        ],
      },
      drillFilterOtherVisuals: true,
    },
    howCreated: "InsertVisualButton",
  });
}

function makePage() {
  if (!/^[a-f0-9]{20}$/.test(OVERVIEW_PAGE)) {
    throw new Error("Overview page id must be exactly 20 lowercase hex characters.");
  }
  const overviewDir = path.resolve(pagesRoot, OVERVIEW_PAGE);
  const safeRoot = `${path.resolve(pagesRoot)}${path.sep}`;
  if (!overviewDir.startsWith(safeRoot)) {
    throw new Error(`Refusing to reset page outside report pages: ${overviewDir}`);
  }
  fs.rmSync(overviewDir, { recursive: true, force: true });
  writeJson(path.join(overviewDir, "page.json"), {
    $schema: PAGE_SCHEMA,
    name: OVERVIEW_PAGE,
    displayName: "Tổng quan",
    displayOption: "FitToWidth",
    height: 1600,
    width: 1400,
    objects: {
      background: [
        {
          properties: {
            color: fill(C.canvas),
            transparency: num(0),
          },
        },
      ],
      outspacePane: [
        {
          properties: {
            backgroundColor: fill("#E8EEF5"),
            transparency: num(0),
          },
        },
      ],
    },
  });
  fs.mkdirSync(path.join(overviewDir, "visuals"), { recursive: true });

  const pagesFile = path.join(pagesRoot, "pages.json");
  const pages = readJson(pagesFile);
  pages.pageOrder = [
    OVERVIEW_PAGE,
    ...pages.pageOrder.filter((pageId) => pageId !== OVERVIEW_PAGE),
  ];
  pages.activePageName = OVERVIEW_PAGE;
  writeJson(pagesFile, pages);
}

function main() {
  makePage();

  makeTextbox(
    IDS.title,
    position(32, 32, 856, 80, 1000),
    [
      {
        textRuns: [
          textRun(
            "TIẾN ĐỘ CDS VÀ CÁC NGOẠI LỆ CẦN ƯU TIÊN",
            22,
            C.navy,
            true,
          ),
        ],
      },
      {
        textRuns: [
          textRun(
            "Số hóa & AI · trạng thái thực hiện · công việc quá hạn",
            11,
            C.muted,
          ),
        ],
      },
    ],
    "Trang tổng quan tiến độ CDS và các ngoại lệ cần ưu tiên.",
  );
  makeSlicer();
  makeNavigation();

  const cardPositions = [32, 304, 576, 848, 1120].map((x, index) =>
    position(x, 136, 256, 152, 4000 + index * 1000),
  );
  makeCard({
    id: IDS.progress,
    pos: cardPositions[0],
    field: measureField("Project_a", "Measure 4"),
    queryRef: "Project_a.Measure 4",
    nativeQueryRef: "Measure 4",
    displayName: "Tiến độ Số hóa / AI",
    label: "TIẾN ĐỘ SỐ HÓA / AI",
    accent: C.cyan,
    valueSize: 20,
    altText: "Tiến độ tổng hợp Số hóa và AI trong phạm vi tag đang chọn.",
  });
  makeCard({
    id: IDS.total,
    pos: cardPositions[1],
    field: aggregationField("Project", "ID", 2),
    queryRef: "Count(Project.ID)",
    nativeQueryRef: "Count of ID",
    displayName: "Tổng công việc",
    label: "TỔNG CÔNG VIỆC",
    accent: C.navy2,
    altText: "Tổng số công việc CDS trong phạm vi lọc.",
  });
  makeCard({
    id: IDS.inProgress,
    pos: cardPositions[2],
    field: aggregationField("Project", "ID", 2),
    queryRef: "Count(Project.ID)",
    nativeQueryRef: "Count of ID",
    displayName: "Đang thực hiện",
    label: "ĐANG THỰC HIỆN",
    accent: C.blue,
    filter: categoricalFilter(1, "Project", "status", ["Đang thực hiện"]),
    altText: "Số công việc đang thực hiện trong phạm vi lọc.",
  });
  makeCard({
    id: IDS.overdue,
    pos: cardPositions[3],
    field: aggregationField("Project", "ID", 2),
    queryRef: "Count(Project.ID)",
    nativeQueryRef: "Count of ID",
    displayName: "Quá hạn",
    label: "QUÁ HẠN",
    accent: C.danger,
    filter: categoricalFilter(2, "Project", "is_overdue_task", ["Có"]),
    altText: "Số công việc quá hạn cần ưu tiên.",
  });
  makeCard({
    id: IDS.completed,
    pos: cardPositions[4],
    field: aggregationField("Project", "ID", 2),
    queryRef: "Count(Project.ID)",
    nativeQueryRef: "Count of ID",
    displayName: "Hoàn thành / Đóng",
    label: "HOÀN THÀNH / ĐÓNG",
    accent: C.success,
    filter: categoricalFilter(3, "Project", "status", [
      "Hoàn thành",
      "Đóng",
    ]),
    altText: "Số công việc đã hoàn thành hoặc đóng.",
  });

  makeBarChart({
    id: IDS.statusChart,
    pos: position(32, 320, 656, 440, 9000),
    title: "Khối lượng công việc theo trạng thái",
    categoryProperty: "status",
    measureProperty: "ID",
    measureFunction: 2,
    measureQueryRef: "Count(Project.ID)",
    measureNativeRef: "Count of ID",
    measureDisplayName: "Số công việc",
    color: C.blue,
    sort: "value",
    altText:
      "So sánh số công việc theo trạng thái, sắp xếp trạng thái có nhiều việc nhất lên trước.",
  });
  makeBarChart({
    id: IDS.levelChart,
    pos: position(712, 320, 656, 440, 10000),
    title: "Tiến độ bình quân theo cấp công việc",
    categoryProperty: "deep_level",
    measureProperty: "percent",
    measureFunction: 1,
    measureQueryRef: "Sum(Project.percent)",
    measureNativeRef: "Average of percent",
    measureDisplayName: "Tiến độ bình quân",
    measureFormat: "0%",
    color: C.cyan,
    sort: "category",
    filter: categoricalFilter(4, "Project", "deep_level", [
      "Cấp 1",
      "Cấp 2",
      "Cấp 3",
      "Cấp 4",
      "Cấp 5",
    ]),
    percent: true,
    altText:
      "So sánh tiến độ bình quân của các cấp công việc từ Cấp 1 đến Cấp 5.",
  });

  makeTable();
  makeTextbox(
    IDS.footer,
    position(32, 1536, 1336, 32, 12000),
    [
      {
        textRuns: [
          textRun(
            "Nguồn: semantic model Novagroup CDS · Bộ lọc tag áp dụng cho toàn trang.",
            9,
            C.muted,
          ),
        ],
      },
    ],
    "Ghi chú nguồn dữ liệu và phạm vi bộ lọc.",
  );

  console.log(`Overview page ${OVERVIEW_PAGE} created with 12 visuals.`);
}

main();
