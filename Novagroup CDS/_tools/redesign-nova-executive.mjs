import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const reportRoot = path.join(projectRoot, "Novagroup CDS.Report");
const definitionRoot = path.join(reportRoot, "definition");
const pagesRoot = path.join(definitionRoot, "pages");
const resourcesRoot = path.join(reportRoot, "StaticResources", "RegisteredResources");

const MAIN_PAGE = "8835187e53de26de86d4";
const TOOLTIP_PAGE = "577f4ab068ea4d1bae74";
const DETAIL_PAGE = "6f02cab8d39dc9a02a96";
const SUMMARY_CARD = "f978ff74a012138d0bc4";
const SUMMARY_TEXT = "15e0aaaccaec96815808";
const TAG_SLICER = "5d42a8e006638aed49d5";
const FLOW_BUTTON = "37c64585e2ce180b342d";
const SIDEBAR_SHAPE = "a11ce000000000000001";
const DETAIL_TITLE = "a11ce000000000000002";
const THEME_FILE = "NovaExecutiveMap-9B7C11FD8A3547AA9B4E61D2694F9D21.json";
const SVG_FILE = "SH_AI-Page-1.drawio_(5)48423568257788063.svg";

const C = {
  canvas: "#F4F7FB",
  outspace: "#E8EEF5",
  surface: "#FFFFFF",
  navy: "#0F2B46",
  navy2: "#0F4C81",
  blue: "#2F80ED",
  cyan: "#27B3C5",
  text: "#102A43",
  muted: "#5B7083",
  border: "#D7E2EC",
  connector: "#8498AA",
  linkFill: "#EAF3FB",
  linkText: "#0B5CAD",
  success: "#14B87A",
  warning: "#F5A623",
  danger: "#E04F5F",
};

const schemaVisual =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.11.0/schema.json";
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
  return literal(`'${value.replaceAll("'", "''")}'`);
}

function color(value) {
  return { solid: { color: literal(`'${value}'`) } };
}

function selectorKey(selector) {
  return selector ? JSON.stringify(selector) : "";
}

function mergeObjectEntry(container, objectName, properties, selector = undefined) {
  container[objectName] ??= [];
  const key = selectorKey(selector);
  let entry = container[objectName].find(
    (candidate) => selectorKey(candidate.selector) === key,
  );
  if (!entry) {
    entry = { properties: {} };
    if (selector !== undefined) entry.selector = selector;
    container[objectName].push(entry);
  }
  entry.properties ??= {};
  Object.assign(entry.properties, properties);
  return entry;
}

function setPosition(doc, { x, y, width, height, z, tabOrder = z }) {
  doc.position = { x, y, z, height, width, tabOrder };
}

function styleVco(doc, options = {}) {
  const vco = (doc.visual.visualContainerObjects ??= {});
  mergeObjectEntry(vco, "background", {
    show: bool(options.backgroundShow ?? false),
    color: color(options.backgroundColor ?? C.surface),
    transparency: num(options.backgroundTransparency ?? 0),
  });
  mergeObjectEntry(vco, "border", {
    show: bool(options.borderShow ?? false),
    color: color(options.borderColor ?? C.border),
    radius: num(options.radius ?? 10),
    width: num(options.borderWidth ?? 1),
  });
  mergeObjectEntry(vco, "padding", {
    top: num(options.paddingTop ?? 0),
    bottom: num(options.paddingBottom ?? 0),
    left: num(options.paddingLeft ?? 0),
    right: num(options.paddingRight ?? 0),
  });
  mergeObjectEntry(vco, "visualHeader", { show: bool(false) });
}

function pageFile(pageId) {
  return path.join(pagesRoot, pageId, "page.json");
}

function visualFile(pageId, visualId) {
  return path.join(pagesRoot, pageId, "visuals", visualId, "visual.json");
}

function configurePage(pageId, background = C.canvas) {
  const file = pageFile(pageId);
  const page = readJson(file);
  page.objects ??= {};
  const bg = mergeObjectEntry(page.objects, "background", {
    color: color(background),
    transparency: num(0),
  });
  if (pageId !== MAIN_PAGE) delete bg.properties.image;
  const outspace = mergeObjectEntry(page.objects, "outspacePane", {
    backgroundColor: color(C.outspace),
    transparency: num(0),
  });
  delete outspace.properties.color;
  writeJson(file, page);
}

function cardMeasureRef(doc) {
  return (
    doc.visual?.query?.queryState?.Data?.projections?.[0]?.queryRef ??
    doc.visual?.query?.queryState?.Values?.projections?.[0]?.queryRef ??
    ""
  );
}

function styleHierarchyCard(doc) {
  const objects = (doc.visual.objects ??= {});
  const ref = cardMeasureRef(doc);
  const isBottom = ref.startsWith("Deep lv 1.");
  mergeObjectEntry(
    objects,
    "value",
    {
      textWrap: bool(true),
      fontFamily: str(fontStrong),
      fontSize: num(10),
      fontColor: color(isBottom ? "#087C86" : C.navy2),
      bold: bool(true),
      horizontalAlignment: str("center"),
    },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "label",
    { show: bool(false) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "fillCustom",
    { show: bool(false), fillColor: color(C.surface), transparency: num(0) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "accentBar",
    { show: bool(false) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "outline",
    { show: bool(false) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "padding",
    {
      paddingSelection: str("Custom"),
      leftMargin: num(0, "L"),
      topMargin: num(0, "L"),
      rightMargin: num(0, "L"),
      bottomMargin: num(0, "L"),
    },
    { id: "default" },
  );
  styleVco(doc, {
    backgroundShow: false,
    borderShow: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
}

function styleSummaryCard() {
  const file = visualFile(MAIN_PAGE, SUMMARY_CARD);
  const doc = readJson(file);
  setPosition(doc, {
    x: 48,
    y: 164,
    width: 296,
    height: 108,
    z: 62000,
  });
  const objects = (doc.visual.objects ??= {});
  mergeObjectEntry(
    objects,
    "value",
    {
      textWrap: bool(true),
      fontFamily: str(fontStrong),
      fontSize: num(18),
      fontColor: color(C.surface),
      bold: bool(true),
      horizontalAlignment: str("center"),
    },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "label",
    { show: bool(false) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "fillCustom",
    { show: bool(true), fillColor: color(C.navy), transparency: num(0) },
    { id: "default" },
  );
  mergeObjectEntry(objects, "fillCustom", { show: bool(true) });
  mergeObjectEntry(
    objects,
    "accentBar",
    {
      show: bool(true),
      position: str("Top"),
      color: color(C.cyan),
      transparency: num(0),
      width: num(5),
    },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "outline",
    {
      show: bool(true),
      lineColor: color("#214A68"),
      transparency: num(0),
      weight: num(1),
    },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "padding",
    {
      paddingSelection: str("Custom"),
      leftMargin: num(14, "L"),
      topMargin: num(10, "L"),
      rightMargin: num(14, "L"),
      bottomMargin: num(10, "L"),
    },
    { id: "default" },
  );
  styleVco(doc, {
    backgroundShow: false,
    borderShow: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
  const title = (doc.visual.visualContainerObjects ??= {});
  mergeObjectEntry(title, "title", { show: bool(false) });
  writeJson(file, doc);
}

function styleSummaryText() {
  const file = visualFile(MAIN_PAGE, SUMMARY_TEXT);
  const doc = readJson(file);
  setPosition(doc, {
    x: 48,
    y: 48,
    width: 190,
    height: 100,
    z: 63000,
  });
  doc.visual.objects ??= {};
  doc.visual.objects.general = [
    {
      properties: {
        paragraphs: [
          {
            textRuns: [
              {
                value: "BẢN ĐỒ TIẾN ĐỘ CDS",
                textStyle: {
                  fontFamily: fontStrong,
                  fontWeight: "bold",
                  fontSize: "20pt",
                  color: C.navy,
                },
              },
            ],
          },
          {
            textRuns: [
              {
                value: "Số hóa & AI theo đơn vị",
                textStyle: {
                  fontFamily: fontBody,
                  fontSize: "10pt",
                  color: C.muted,
                },
              },
            ],
          },
        ],
      },
    },
  ];
  styleVco(doc, {
    backgroundShow: false,
    borderShow: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
  writeJson(file, doc);
}

function styleSlicer() {
  const file = visualFile(MAIN_PAGE, TAG_SLICER);
  const doc = readJson(file);
  setPosition(doc, {
    x: 48,
    y: 284,
    width: 296,
    height: 80,
    z: 64000,
  });
  const objects = (doc.visual.objects ??= {});
  mergeObjectEntry(objects, "data", { mode: str("Dropdown") });
  mergeObjectEntry(objects, "header", {
    show: bool(true),
    fontFamily: str(fontStrong),
    textSize: num(10),
    fontColor: color(C.navy),
    background: color(C.surface),
  });
  mergeObjectEntry(objects, "items", {
    fontFamily: str(fontBody),
    textSize: num(10),
    fontColor: color(C.text),
    background: color(C.surface),
  });
  styleVco(doc, {
    backgroundShow: true,
    backgroundColor: C.surface,
    borderShow: true,
    borderColor: C.border,
    radius: 10,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
  });
  writeJson(file, doc);
}

function styleFlowButton() {
  const file = visualFile(MAIN_PAGE, FLOW_BUTTON);
  const doc = readJson(file);
  setPosition(doc, {
    x: 248,
    y: 52,
    width: 96,
    height: 48,
    z: 65000,
  });
  const objects = (doc.visual.objects ??= {});
  mergeObjectEntry(
    objects,
    "buttonFill",
    { color: color(C.blue) },
    { id: "default" },
  );
  styleVco(doc, {
    backgroundShow: false,
    borderShow: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
  writeJson(file, doc);
}

function makeSidebarShape() {
  const doc = {
    $schema: schemaVisual,
    name: SIDEBAR_SHAPE,
    position: {
      x: 24,
      y: 24,
      z: 61000,
      height: 372,
      width: 344,
      tabOrder: 61000,
    },
    visual: {
      visualType: "shape",
      objects: {
        shape: [
          {
            properties: {
              tileShape: str("rectangle"),
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
              show: bool(false),
              fillColor: color(C.surface),
              transparency: num(0),
            },
            selector: { id: "default" },
          },
        ],
        text: [
          {
            properties: {
              show: bool(false),
            },
          },
        ],
        outline: [
          {
            properties: {
              show: bool(false),
              lineColor: color(C.border),
              transparency: num(0),
              weight: num(1),
            },
            selector: { id: "default" },
          },
        ],
      },
      visualContainerObjects: {
        background: [
          {
            properties: {
              show: bool(true),
              color: color(C.surface),
              transparency: num(0),
            },
          },
        ],
        border: [
          {
            properties: {
              show: bool(true),
              color: color(C.border),
              radius: num(12),
              width: num(1),
            },
          },
        ],
        padding: [
          {
            properties: {
              top: num(0),
              bottom: num(0),
              left: num(0),
              right: num(0),
            },
          },
        ],
        visualHeader: [{ properties: { show: bool(false) } }],
      },
      drillFilterOtherVisuals: true,
    },
    howCreated: "InsertVisualButton",
  };
  writeJson(visualFile(MAIN_PAGE, SIDEBAR_SHAPE), doc);
}

function styleDetailLink(doc) {
  const objects = (doc.visual.objects ??= {});
  mergeObjectEntry(objects, "fill", { show: bool(false) });
  mergeObjectEntry(
    objects,
    "fill",
    { show: bool(false), fillColor: color(C.linkFill), transparency: num(100) },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "text",
    {
      show: bool(true),
      text: str("Xem chi tiết"),
      fontFamily: str(fontStrong),
      fontSize: num(8),
      fontColor: color(C.linkText),
      bold: bool(false),
      underline: bool(false),
      horizontalAlignment: str("center"),
      verticalAlignment: str("middle"),
    },
    { id: "default" },
  );
  mergeObjectEntry(
    objects,
    "outline",
    { show: bool(false), lineColor: color(C.linkFill), transparency: num(100) },
    { id: "default" },
  );
  styleVco(doc, {
    backgroundShow: false,
    borderShow: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
}

function styleMainVisuals() {
  const visualsRoot = path.join(pagesRoot, MAIN_PAGE, "visuals");
  for (const entry of fs.readdirSync(visualsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(visualsRoot, entry.name, "visual.json");
    if (!fs.existsSync(file)) continue;
    const doc = readJson(file);
    if (doc.name === SUMMARY_CARD || doc.name === SUMMARY_TEXT ||
        doc.name === TAG_SLICER || doc.name === FLOW_BUTTON ||
        doc.name === SIDEBAR_SHAPE) {
      continue;
    }
    if (doc.visual?.visualType === "cardVisual") {
      if ((doc.position?.height ?? 0) > 64.01) {
        doc.position.y = Math.max((doc.position.y ?? 0) - 8, 0);
        doc.position.height = 64;
      }
      styleHierarchyCard(doc);
      writeJson(file, doc);
    } else if (doc.visual?.visualType === "shape") {
      if ((doc.position?.height ?? 0) > 16.01) {
        doc.position.y = Math.max((doc.position.y ?? 0) - 8, 0);
        doc.position.height = 16;
      }
      if ((doc.position?.width ?? 0) > 80.01) {
        doc.position.x += doc.position.width - 80;
        doc.position.width = 80;
      }
      styleDetailLink(doc);
      writeJson(file, doc);
    }
  }
}

function styleTable(doc) {
  const objects = (doc.visual.objects ??= {});
  const headers = mergeObjectEntry(objects, "columnHeaders", {
    fontFamily: str(fontStrong),
    fontSize: num(10),
    fontColor: color(C.surface),
    backColor: color(C.navy2),
    bold: bool(true),
    autoSizeColumnWidth: bool(true),
    columnAdjustment: str("growToFit"),
    wordWrap: bool(true),
    outlineColor: color(C.border),
  });
  delete headers.properties.outline;
  mergeObjectEntry(objects, "values", {
    fontFamily: str(fontBody),
    fontSize: num(10),
    backColorPrimary: color(C.surface),
    backColorSecondary: color("#F7FAFC"),
    fontColorPrimary: color(C.text),
    fontColorSecondary: color(C.text),
    wordWrap: bool(true),
  });
  mergeObjectEntry(objects, "grid", {
    gridHorizontal: bool(true),
    gridHorizontalColor: color(C.border),
    gridVertical: bool(false),
    gridVerticalColor: color(C.border),
    outlineColor: color(C.border),
    outlineStyle: num(1),
  });
  const vco = (doc.visual.visualContainerObjects ??= {});
  mergeObjectEntry(vco, "stylePreset", { name: str("None") });
  mergeObjectEntry(vco, "title", { show: bool(false) });
  styleVco(doc, {
    backgroundShow: true,
    backgroundColor: C.surface,
    borderShow: true,
    borderColor: C.border,
    radius: 10,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  });
}

function makeDetailTitle() {
  const doc = {
    $schema: schemaVisual,
    name: DETAIL_TITLE,
    position: {
      x: 96,
      y: 16,
      z: 3000,
      height: 44,
      width: 760,
      tabOrder: 3000,
    },
    visual: {
      visualType: "textbox",
      objects: {
        general: [
          {
            properties: {
              paragraphs: [
                {
                  textRuns: [
                    {
                      value: "CHI TIẾT TIẾN ĐỘ CÔNG VIỆC",
                      textStyle: {
                        fontFamily: fontStrong,
                        fontWeight: "bold",
                        fontSize: "18pt",
                        color: C.navy,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
      visualContainerObjects: {
        background: [{ properties: { show: bool(false) } }],
        border: [{ properties: { show: bool(false) } }],
        padding: [
          {
            properties: {
              top: num(0),
              bottom: num(0),
              left: num(0),
              right: num(0),
            },
          },
        ],
        visualHeader: [{ properties: { show: bool(false) } }],
      },
      drillFilterOtherVisuals: true,
    },
  };
  writeJson(visualFile(DETAIL_PAGE, DETAIL_TITLE), doc);
}

function styleSupportPages() {
  const tooltipVisuals = path.join(pagesRoot, TOOLTIP_PAGE, "visuals");
  for (const entry of fs.readdirSync(tooltipVisuals, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(tooltipVisuals, entry.name, "visual.json");
    const doc = readJson(file);
    if (doc.visual?.visualType !== "tableEx") continue;
    setPosition(doc, {
      x: 8,
      y: 8,
      width: 784,
      height: 384,
      z: 1000,
    });
    styleTable(doc);
    writeJson(file, doc);
  }

  const detailVisuals = path.join(pagesRoot, DETAIL_PAGE, "visuals");
  for (const entry of fs.readdirSync(detailVisuals, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(detailVisuals, entry.name, "visual.json");
    const doc = readJson(file);
    if (doc.visual?.visualType === "tableEx") {
      setPosition(doc, {
        x: 24,
        y: 80,
        width: 1232,
        height: 616,
        z: 1000,
      });
      styleTable(doc);
      writeJson(file, doc);
    } else if (doc.visual?.visualType === "actionButton") {
      setPosition(doc, {
        x: 24,
        y: 16,
        width: 56,
        height: 40,
        z: 4000,
      });
      styleVco(doc, {
        backgroundShow: false,
        borderShow: false,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      });
      writeJson(file, doc);
    }
  }
}

function restyleSvg() {
  const file = path.join(resourcesRoot, SVG_FILE);
  let svg = fs.readFileSync(file, "utf8");
  const replacements = [
    [/#4EAAC1/g, C.blue],
    [/#4eaac1/g, C.blue],
    [/#EDEDED/g, "#DCE5EE"],
    [/stroke="#000000"/g, `stroke="${C.connector}"`],
    [/stroke: #000000/g, `stroke: ${C.connector}`],
    [/strokeColor=#000000/g, `strokeColor=${C.connector}`],
    [/fontColor=#000000/g, `fontColor=${C.text}`],
    [/fill="#000000"/g, `fill="${C.text}"`],
    [
      /stroke: light-dark\(rgb\(0, 0, 0\), rgb\(255, 255, 255\)\)/g,
      "stroke: light-dark(rgb(132, 152, 170), rgb(132, 152, 170))",
    ],
    [
      /stroke: light-dark\(rgb\(78, 170, 193\), rgb\(43, 122, 142\)\)/g,
      "stroke: light-dark(rgb(47, 128, 237), rgb(47, 128, 237))",
    ],
    [/font-family: Helvetica/g, "font-family: 'Segoe UI'"],
    [/background-color: rgb\(255, 255, 255\)/g, "background-color: rgb(244, 247, 251)"],
  ];
  for (const [pattern, replacement] of replacements) {
    svg = svg.replace(pattern, replacement);
  }
  fs.writeFileSync(file, svg, "utf8");
}

function writeTheme() {
  const theme = {
    $schema:
      "https://raw.githubusercontent.com/microsoft/powerbi-desktop-samples/main/Report%20Theme%20JSON%20Schema/reportThemeSchema-2.153.json",
    name: THEME_FILE,
    dataColors: [
      C.blue,
      C.cyan,
      C.navy2,
      C.success,
      C.warning,
      "#7A6FF0",
      C.danger,
      "#6B7C93",
    ],
    good: C.success,
    neutral: C.warning,
    bad: C.danger,
    maximum: C.blue,
    center: C.cyan,
    minimum: "#DCEAF6",
    null: "#94A3B8",
    foreground: C.text,
    foregroundNeutralSecondary: C.muted,
    foregroundNeutralTertiary: "#829AB1",
    backgroundLight: C.canvas,
    backgroundNeutral: C.border,
    background: C.surface,
    tableAccent: C.navy2,
    textClasses: {
      callout: {
        fontSize: 28,
        fontFace: fontStrong,
        color: C.navy,
      },
      title: {
        fontSize: 14,
        fontFace: fontStrong,
        color: C.navy,
      },
      header: {
        fontSize: 12,
        fontFace: fontStrong,
        color: C.text,
      },
      label: {
        fontSize: 10,
        fontFace: fontBody,
        color: C.text,
      },
    },
    visualStyles: {
      "*": {
        "*": {
          dropShadow: [{ show: false }],
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
              backColor: { solid: { color: C.navy2 } },
              fontColor: { solid: { color: C.surface } },
              bold: true,
            },
          ],
          values: [
            {
              backColorPrimary: { solid: { color: C.surface } },
              backColorSecondary: { solid: { color: "#F7FAFC" } },
              fontColorPrimary: { solid: { color: C.text } },
              fontColorSecondary: { solid: { color: C.text } },
            },
          ],
        },
      },
    },
  };
  writeJson(path.join(resourcesRoot, THEME_FILE), theme);

  const reportFile = path.join(definitionRoot, "report.json");
  const report = readJson(reportFile);
  report.themeCollection ??= {};
  report.themeCollection.customTheme = {
    name: THEME_FILE,
    reportVersionAtImport: {
      ...(report.themeCollection.baseTheme?.reportVersionAtImport ?? {
        visual: "1.8.95",
        report: "2.0.95",
        page: "1.3.95",
      }),
    },
    type: "RegisteredResources",
  };
  report.resourcePackages ??= [];
  let registered = report.resourcePackages.find(
    (pkg) => pkg.name === "RegisteredResources",
  );
  if (!registered) {
    registered = {
      name: "RegisteredResources",
      type: "RegisteredResources",
      items: [],
    };
    report.resourcePackages.unshift(registered);
  }
  registered.items ??= [];
  registered.items = registered.items.filter(
    (item) => item.type !== "CustomTheme" || item.name === THEME_FILE,
  );
  if (!registered.items.some((item) => item.name === THEME_FILE)) {
    registered.items.push({
      name: THEME_FILE,
      path: THEME_FILE,
      type: "CustomTheme",
    });
  }
  writeJson(reportFile, report);
}

function main() {
  for (const id of [SIDEBAR_SHAPE, DETAIL_TITLE]) {
    if (id.length !== 20 || !/^[a-f0-9]+$/i.test(id)) {
      throw new Error(`Visual id must be 20 hex characters: ${id}`);
    }
  }
  for (const pageId of [MAIN_PAGE, TOOLTIP_PAGE, DETAIL_PAGE]) {
    configurePage(pageId);
  }
  makeSidebarShape();
  styleMainVisuals();
  styleSummaryCard();
  styleSummaryText();
  styleSlicer();
  styleFlowButton();
  styleSupportPages();
  makeDetailTitle();
  restyleSvg();
  writeTheme();
  console.log("Nova Executive Map redesign applied.");
}

main();
