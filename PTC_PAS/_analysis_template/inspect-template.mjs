import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = "C:\\Users\\Admin\\Desktop\\PowerBI Visualize\\PTC_PAS";
const inputPath = path.join(root, "Template công nợ_Build dashboard.xlsx");
const outputDir = path.join(root, "_analysis_template", "renders");

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheetInfo = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 12000,
});
console.log("=== SHEETS ===");
console.log(sheetInfo.ndjson);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,drawing,definedName",
  maxChars: 30000,
  tableMaxRows: 8,
  tableMaxCols: 14,
  tableMaxCellChars: 100,
});
console.log("=== OVERVIEW ===");
console.log(overview.ndjson);

const sheetNames = [];
for (const line of sheetInfo.ndjson.split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    const name = obj.name ?? obj.sheetName ?? obj.data?.name;
    if (typeof name === "string" && !sheetNames.includes(name)) sheetNames.push(name);
  } catch {}
}

for (const sheetName of sheetNames) {
  const region = await workbook.inspect({
    kind: "region",
    sheetId: sheetName,
    maxChars: 18000,
    tableMaxRows: 15,
    tableMaxCols: 20,
    tableMaxCellChars: 120,
  });
  console.log(`=== REGION: ${sheetName} ===`);
  console.log(region.ndjson);

  const formulas = await workbook.inspect({
    kind: "formula",
    sheetId: sheetName,
    maxChars: 8000,
    options: { maxResults: 100 },
  });
  console.log(`=== FORMULAS: ${sheetName} ===`);
  console.log(formulas.ndjson);

  const preview = await workbook.render({
    sheetName,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  const safeName = sheetName.replace(/[<>:"/\\|?*]/g, "_");
  await fs.writeFile(
    path.join(outputDir, `${safeName}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

console.log(`Rendered ${sheetNames.length} sheet(s) to ${outputDir}`);
