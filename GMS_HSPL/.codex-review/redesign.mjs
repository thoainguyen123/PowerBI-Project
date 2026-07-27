import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(root, 'GMS_HSPL.Report');
const pageId = '3c3cf92407c11b2a6405';
const visualRoot = path.join(reportDir, 'definition', 'pages', pageId, 'visuals');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const lit = (value) => ({ expr: { Literal: { Value: value } } });
const bool = (value) => lit(value ? 'true' : 'false');
const num = (value) => lit(`${value}D`);
const integer = (value) => lit(`${value}L`);
const str = (value) => lit(`'${value.replaceAll("'", "''")}'`);
const color = (hex) => ({ solid: { color: lit(`'${hex}'`) } });

function visualPath(id) {
  return path.join(visualRoot, id, 'visual.json');
}

function loadVisual(id) {
  return readJson(visualPath(id));
}

function saveVisual(id, visual) {
  writeJson(visualPath(id), visual);
}

function setPosition(v, x, y, width, height, z, tabOrder = z) {
  v.position = { x, y, z, height, width, tabOrder };
}

function entry(properties, selector) {
  const result = { properties };
  if (selector) result.selector = selector;
  return [result];
}

function setObject(v, name, properties, selector) {
  v.visual.objects ??= {};
  v.visual.objects[name] = entry(properties, selector);
}

function setVco(v, name, properties, selector) {
  v.visual.visualContainerObjects ??= {};
  v.visual.visualContainerObjects[name] = entry(properties, selector);
}

function applyCardFrame(v, { padding = 8, title, altText, background = '#FFFFFF' } = {}) {
  setVco(v, 'background', { show: bool(true), color: color(background), transparency: num(0) });
  setVco(v, 'border', { show: bool(true), color: color('#D9E2EC'), radius: num(8), width: num(1) });
  setVco(v, 'padding', { top: num(padding), bottom: num(padding), left: num(padding), right: num(padding) });
  setVco(v, 'visualHeader', { show: bool(false) });
  if (title) {
    setVco(v, 'title', {
      show: bool(true),
      text: str(title),
      fontFamily: str('Segoe UI Semibold'),
      fontSize: num(11),
      fontColor: color('#172033'),
      alignment: str('left'),
      heading: str('Heading3')
    });
  }
  if (altText) setVco(v, 'general', { altText: str(altText) });
}

const themeBasePath = 'C:\\Users\\Admin\\.codex\\skills\\powerbi-report-design\\assets\\base.json';
const theme = readJson(themeBasePath);
const themeFile = 'GMSCorporateCool-7f3a2c91.json';
theme.name = themeFile;
theme.dataColors = ['#0E7490', '#1D4ED8', '#F59E0B', '#7C3AED', '#059669', '#DC2626', '#64748B', '#0891B2'];
theme.good = '#15803D';
theme.neutral = '#B45309';
theme.bad = '#B91C1C';
theme.maximum = '#0E7490';
theme.center = '#E2E8F0';
theme.minimum = '#D9F3F7';
theme.null = '#94A3B8';
theme.foreground = '#172033';
theme.firstLevelElements = '#172033';
theme.secondLevelElements = '#475569';
theme.thirdLevelElements = '#CBD5E1';
theme.fourthLevelElements = '#64748B';
theme.background = '#FFFFFF';
theme.secondaryBackground = '#F4F7FB';
theme.tableAccent = '#0E7490';
theme.textClasses = {
  callout: { fontSize: 28, fontFace: 'Segoe UI Semibold', color: '#0E7490' },
  title: { fontSize: 12, fontFace: 'Segoe UI Semibold', color: '#172033' },
  header: { fontSize: 11, fontFace: 'Segoe UI Semibold', color: '#172033' },
  label: { fontSize: 10, fontFace: 'Segoe UI', color: '#475569' }
};

theme.visualStyles['*']['*'] = {
  ...(theme.visualStyles['*']['*'] ?? {}),
  title: [{ show: true, fontFamily: 'Segoe UI Semibold', fontSize: 11, fontColor: { solid: { color: '#172033' } } }],
  background: [{ show: true, color: { solid: { color: '#FFFFFF' } }, transparency: 0 }],
  border: [{ show: true, color: { solid: { color: '#D9E2EC' } }, radius: 8, width: 1 }],
  dropShadow: [{ show: false }],
  visualHeader: [{ show: false }],
  padding: [{ top: 8, bottom: 8, left: 8, right: 8 }],
  categoryAxis: [{ gridlineStyle: 'dotted', gridlineColor: { solid: { color: '#E2E8F0' } }, labelColor: { solid: { color: '#475569' } } }],
  valueAxis: [{ gridlineStyle: 'dotted', gridlineColor: { solid: { color: '#E2E8F0' } }, labelColor: { solid: { color: '#475569' } } }]
};

for (const slicerType of ['slicer', 'filterSlicer', 'advancedSlicerVisual']) {
  theme.visualStyles[slicerType] ??= {};
  theme.visualStyles[slicerType]['*'] = {
    ...(theme.visualStyles[slicerType]['*'] ?? {}),
    header: [{ fontFamily: 'Segoe UI Semibold', textSize: 10, fontColor: { solid: { color: '#172033' } }, background: { solid: { color: '#FFFFFF' } }, outlineStyle: 0 }],
    items: [{ fontFamily: 'Segoe UI', textSize: 9, fontColor: { solid: { color: '#475569' } }, background: { solid: { color: '#FFFFFF' } }, outlineStyle: 0, padding: 2 }]
  };
}

// The current Desktop theme schema exposes different objects for the modern
// button slicer. This report only uses the classic slicer, so keep its theme
// entry focused and avoid registering unsupported modern-slicer objects.
delete theme.visualStyles.advancedSlicerVisual;

// Card container geometry is applied per visual below because these properties
// do not cascade reliably through the current theme schema.
delete theme.visualStyles.cardVisual;

theme.visualStyles.pivotTable['*'] = {
  ...(theme.visualStyles.pivotTable['*'] ?? {}),
  columnHeaders: [{ autoSizeColumnWidth: true, columnAdjustment: 'growToFit', backColor: { solid: { color: '#E8F0F7' } }, fontColor: { solid: { color: '#172033' } }, bold: true }],
  rowHeaders: [{ backColor: { solid: { color: '#FFFFFF' } }, fontColor: { solid: { color: '#172033' } } }],
  values: [{ backColorPrimary: { solid: { color: '#FFFFFF' } }, backColorSecondary: { solid: { color: '#F7FAFC' } }, fontColorPrimary: { solid: { color: '#334155' } }, fontColorSecondary: { solid: { color: '#334155' } } }],
  grid: [{ gridHorizontal: true, gridHorizontalColor: { solid: { color: '#E2E8F0' } }, gridHorizontalWeight: 1, gridVertical: false, rowPadding: 4 }]
};

const registeredDir = path.join(reportDir, 'StaticResources', 'RegisteredResources');
fs.mkdirSync(registeredDir, { recursive: true });
writeJson(path.join(registeredDir, themeFile), theme);

const reportPath = path.join(reportDir, 'definition', 'report.json');
const report = readJson(reportPath);
const version = report.themeCollection.baseTheme.reportVersionAtImport;
report.themeCollection.customTheme = { name: themeFile, reportVersionAtImport: version, type: 'RegisteredResources' };
let registered = report.resourcePackages.find((p) => p.name === 'RegisteredResources');
if (!registered) {
  registered = { name: 'RegisteredResources', type: 'RegisteredResources', items: [] };
  report.resourcePackages.unshift(registered);
}
registered.items = registered.items.filter((item) => item.type !== 'CustomTheme');
registered.items.push({ name: themeFile, path: themeFile, type: 'CustomTheme' });
writeJson(reportPath, report);

const pagePath = path.join(reportDir, 'definition', 'pages', pageId, 'page.json');
const page = readJson(pagePath);
page.displayName = 'Tổng quan hồ sơ pháp lý';
page.objects ??= {};
page.objects.background = entry({ color: color('#F4F7FB'), transparency: num(0) });
writeJson(pagePath, page);

const ids = {
  created: '9b9d074cc180767935b4',
  issued: '00a2b03505ca080a9a24',
  region: 'd0ae9fa9c3d6a2a88482',
  delay: '835cba5b1fa52a4f4a4c',
  logo: 'a2534412e4865e8689b9',
  title: '37235b31028d65b8c0e8',
  refreshed: '4ce2cbe900e18aebd27d',
  kpi: 'acf9a972816237cb043b',
  trend: 'b3cc707eb0d41e974656',
  timeMatrix: 'ac4c9e09c32028a4da76',
  detailMatrix: 'ac66b144c78e4631e604'
};

const logo = loadVisual(ids.logo);
setPosition(logo, 16, 16, 112, 64, 10000, 10000);
setVco(logo, 'general', { altText: str('Logo NovaGroup') });
saveVisual(ids.logo, logo);

const title = loadVisual(ids.title);
setPosition(title, 144, 16, 600, 40, 0, 0);
title.visual.objects.general[0].properties.paragraphs = [{
  textRuns: [{
    value: 'TỔNG QUAN HỒ SƠ PHÁP LÝ DỰ ÁN',
    textStyle: { fontWeight: 'bold', fontFamily: 'Segoe UI Semibold', fontSize: '20pt', color: '#172033' }
  }]
}];
title.visual.visualContainerObjects = {};
setVco(title, 'background', { show: bool(false) });
setVco(title, 'border', { show: bool(false) });
setVco(title, 'padding', { top: num(0), bottom: num(0), left: num(0), right: num(0) });
setVco(title, 'visualHeader', { show: bool(false) });
saveVisual(ids.title, title);

const refreshed = loadVisual(ids.refreshed);
setPosition(refreshed, 144, 56, 320, 40, 1000, 1000);
setVco(refreshed, 'title', {
  ...refreshed.visual.visualContainerObjects.title[0].properties,
  show: bool(true),
  fontFamily: str('Segoe UI'),
  fontSize: num(9),
  fontColor: color('#64748B'),
  alignment: str('left'),
  italic: bool(false),
  bold: bool(false)
});
setVco(refreshed, 'background', { show: bool(false) });
setVco(refreshed, 'border', { show: bool(false) });
setVco(refreshed, 'padding', { top: num(0), bottom: num(0), left: num(0), right: num(0) });
setVco(refreshed, 'visualHeader', { show: bool(false) });
saveVisual(ids.refreshed, refreshed);

const kpi = loadVisual(ids.kpi);
setPosition(kpi, 1088, 8, 240, 88, 2000, 2000);
kpi.visual.visualType = 'cardVisual';
const oldProjection = (kpi.visual.query.queryState.Values ?? kpi.visual.query.queryState.Data).projections[0];
oldProjection.nativeQueryRef = 'Tổng số hồ sơ';
oldProjection.displayName = 'Tổng số hồ sơ';
kpi.visual.query = { queryState: { Data: { projections: [oldProjection] } } };
kpi.visual.objects = {};
setObject(kpi, 'outline', { show: bool(false) }, { id: 'default' });
setObject(kpi, 'accentBar', { show: bool(true), position: str('Left'), width: num(4), color: color('#0E7490'), transparency: num(0) }, { id: 'default' });
setObject(kpi, 'layout', { leftOuterMargin: integer(0), rightOuterMargin: integer(0), topOuterMargin: integer(0), bottomOuterMargin: integer(0), paddingUniform: integer(0) }, { id: 'default' });
setObject(kpi, 'padding', { paddingUniform: integer(0), paddingIndividual: bool(true), leftMargin: integer(12), rightMargin: integer(8), topMargin: integer(0), bottomMargin: integer(0) }, { id: 'default' });
setObject(kpi, 'value', { show: bool(true), fontFamily: str('Segoe UI Semibold'), fontSize: num(24), bold: bool(true), fontColor: color('#0E7490'), horizontalAlignment: str('center'), labelDisplayUnits: num(1), labelPrecision: integer(0) }, { id: 'default' });
setObject(kpi, 'label', { show: bool(true), text: str('Tổng số hồ sơ'), fontFamily: str('Segoe UI'), fontSize: num(10), fontColor: color('#475569'), position: str('belowValue'), horizontalAlignment: str('center') }, { id: 'default' });
kpi.visual.visualContainerObjects = {};
setVco(kpi, 'background', { show: bool(true), color: color('#FFFFFF'), transparency: num(0) });
setVco(kpi, 'border', { show: bool(true), color: color('#C7DCE4'), radius: num(8), width: num(1) });
setVco(kpi, 'padding', { top: num(0), bottom: num(0), left: num(0), right: num(0) });
setVco(kpi, 'visualHeader', { show: bool(false) });
setVco(kpi, 'title', { show: bool(false) });
setVco(kpi, 'general', { altText: str('Tổng số hồ sơ pháp lý trong phạm vi lọc hiện tại') });
saveVisual(ids.kpi, kpi);

const slicerSpecs = [
  [ids.created, 112, 104, 'Ngày tạo', 'Chọn khoảng ngày tạo hồ sơ'],
  [ids.issued, 232, 104, 'Ngày ban hành', 'Chọn khoảng ngày ban hành hồ sơ'],
  [ids.region, 352, 80, 'Vùng', 'Lọc hồ sơ theo vùng'],
  [ids.delay, 448, 80, 'Độ trễ upload (ngày)', 'Lọc hồ sơ theo số ngày trễ upload']
];

for (const [id, y, height, label, altText] of slicerSpecs) {
  const v = loadVisual(id);
  setPosition(v, 16, y, 216, height, 3000 + slicerSpecs.findIndex((s) => s[0] === id) * 1000, 3000 + slicerSpecs.findIndex((s) => s[0] === id) * 1000);
  setObject(v, 'header', { show: bool(true), text: str(label), textSize: num(10), fontFamily: str('Segoe UI Semibold'), fontColor: color('#172033'), background: color('#FFFFFF') });
  setObject(v, 'items', { fontFamily: str('Segoe UI'), textSize: num(9), fontColor: color('#475569'), background: color('#FFFFFF'), padding: num(2) });
  setObject(v, 'date', { fontFamily: str('Segoe UI'), textSize: num(9), fontColor: color('#334155'), background: color('#FFFFFF') });
  v.visual.visualContainerObjects = {};
  applyCardFrame(v, { padding: 8, altText });
  saveVisual(id, v);
}

const trend = loadVisual(ids.trend);
setPosition(trend, 248, 112, 520, 272, 7000, 7000);
setObject(trend, 'lineStyles', { lineChartType: str('smooth'), interpolationSmooth: str('monotoneX'), strokeWidth: num(3), areaShow: bool(true) });
setObject(trend, 'dataPoint', { defaultColor: color('#0E7490'), transparency: num(82) });
setObject(trend, 'labels', { show: bool(true), labelDisplayUnits: num(1), labelPrecision: integer(0), fontSize: num(9), color: color('#334155') });
setObject(trend, 'categoryAxis', { showAxisTitle: bool(false), labelColor: color('#475569'), gridlineShow: bool(false) });
setObject(trend, 'valueAxis', { showAxisTitle: bool(false), labelColor: color('#475569'), gridlineShow: bool(true), gridlineColor: color('#E2E8F0'), gridlineStyle: str('dotted') });
trend.visual.visualContainerObjects = {};
applyCardFrame(trend, { title: 'Lũy kế hồ sơ theo năm', altText: 'Đường xu hướng thể hiện số lượng hồ sơ lũy kế theo năm' });
saveVisual(ids.trend, trend);

function styleMatrix(id, position, titleText, altText) {
  const v = loadVisual(id);
  setPosition(v, ...position);
  delete v.visual.objects.columnWidth;
  setObject(v, 'columnHeaders', { autoSizeColumnWidth: bool(true), columnAdjustment: str('growToFit'), alignment: str('Center'), titleAlignment: str('Left'), backColor: color('#E8F0F7'), fontColor: color('#172033'), bold: bool(true), fontSize: num(10) });
  setObject(v, 'rowHeaders', { steppedLayoutIndentation: num(24), fontColor: color('#172033'), backColor: color('#FFFFFF'), fontSize: num(10) });
  setObject(v, 'values', { backColorPrimary: color('#FFFFFF'), backColorSecondary: color('#F7FAFC'), fontColorPrimary: color('#334155'), fontColorSecondary: color('#334155'), fontSize: num(10) });
  setObject(v, 'grid', { gridHorizontal: bool(true), gridHorizontalColor: color('#E2E8F0'), gridHorizontalWeight: num(1), gridVertical: bool(false), rowPadding: num(4) });
  v.visual.visualContainerObjects = {};
  applyCardFrame(v, { title: titleText, altText });
  setVco(v, 'stylePreset', { name: str('None') });
  saveVisual(id, v);
}

styleMatrix(ids.timeMatrix, [784, 112, 544, 272, 8000, 8000], 'Tiến độ hồ sơ theo thời gian', 'Ma trận số lượng hồ sơ và độ trễ trung bình theo năm, quý và tháng');
styleMatrix(ids.detailMatrix, [248, 400, 1080, 304, 9000, 9000], 'Phân tích hồ sơ theo vùng và đơn vị', 'Ma trận chi tiết số lượng hồ sơ, độ trễ và hồ sơ thiếu tệp theo vùng và đơn vị');
