import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_TMDL = ROOT / "DASHBOARD TQT.SemanticModel" / "definition" / "tables" / "Data.tmdl"
SLICER_JSON = (
    ROOT
    / "DASHBOARD TQT.Report"
    / "definition"
    / "pages"
    / "5bd3737f4bb0549b9e5c"
    / "visuals"
    / "a100000000000000000c"
    / "visual.json"
)


class ContractorSlicerTests(unittest.TestCase):
    def test_model_has_normalized_contractor_column(self):
        text = DATA_TMDL.read_text(encoding="utf-8")
        self.assertIn("column 'Nhà thầu chuẩn' =", text)
        self.assertIn("Data[NT/NCC/TV ]", text)
        self.assertIn("Data[TÊN NHÀ THẦU]", text)
        self.assertIn("TRIM", text)

    def test_overview_has_searchable_contractor_dropdown(self):
        visual = json.loads(SLICER_JSON.read_text(encoding="utf-8"))
        self.assertEqual(visual["visual"]["visualType"], "slicer")
        projection = visual["visual"]["query"]["queryState"]["Values"]["projections"][0]
        self.assertEqual(projection["field"]["Column"]["Expression"]["SourceRef"]["Entity"], "Data")
        self.assertEqual(projection["field"]["Column"]["Property"], "Nhà thầu chuẩn")
        self.assertEqual(projection["queryRef"], "Data.Nhà thầu chuẩn")
        mode = visual["visual"]["objects"]["data"][0]["properties"]["mode"]["expr"]["Literal"]["Value"]
        self.assertEqual(mode, "'Dropdown'")
        search = visual["visual"]["objects"]["general"][0]["properties"]["selfFilterEnabled"]["expr"]["Literal"]["Value"]
        self.assertEqual(search, "true")
        self.assertEqual(visual["position"]["x"], 24)
        self.assertEqual(visual["position"]["y"], 528)
        self.assertEqual(visual["position"]["height"], 80)
        self.assertEqual(visual["position"]["width"], 216)


if __name__ == "__main__":
    unittest.main()
