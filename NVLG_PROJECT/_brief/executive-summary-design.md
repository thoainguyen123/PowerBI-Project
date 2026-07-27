# Executive Summary — Design Contract

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 1
  mode: brownfield
  design_identity:
    current_tone: "NovaLand corporate: white canvas, navy headings, cyan accents"
    current_signature: "NovaLand logo and navy/cyan visual chrome"
    tone: "Corporate Cool, preserving NovaLand navy/cyan brand language"
    signature: "Three domain KPI panels followed by ranked evidence charts"
  archetype: Executive
  color_map:
    - measure: DanhMucDauTu[Executive Tổng bản ghi dự án]
      color: "#1599B5"
    - measure: Eoffice_TD[PL Tổng hạng mục]
      color: "#2E7D32"
    - measure: Eoffice_TD[PL Quá hạn]
      color: "#C62828"
    - measure: Head_Count[Executive Đang tuyển]
      color: "#E67E22"
  pages:
    - name: "Toàn cảnh danh mục dự án, pháp lý và nguồn lực"
      role: landing
      archetype: Executive
      layout_variant: B
      variant_rationale: "Ba mảng dự án, pháp lý và nhân sự có tầm quan trọng ngang nhau, phù hợp dải KPI và các biểu đồ phân tích cân bằng."
      page_background: "#F4F7FB"
      layout_contract:
        canvas: { width: 1170, height: 980, margin: 24, gutter: 16, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            header: [1, 1, 13, 2]
            kpis: [1, 2, 13, 4]
            portfolio: [1, 4, 7, 8]
            regions: [7, 4, 13, 8]
            legal: [1, 8, 5, 13]
            progress: [5, 8, 9, 13]
            hiring: [9, 8, 13, 13]
        placements:
          - { id: page_title, region: header, kind: textbox, text: "Toàn cảnh danh mục dự án, pháp lý và nguồn lực" }
          - { id: project_kpis, region: kpis, kind: cardVisual, purpose: "Quy mô và mức tập trung ở hai giai đoạn đầu", field_bindings: [DanhMucDauTu[Executive Tổng bản ghi dự án], DanhMucDauTu[Executive Tỷ trọng giai đoạn đầu]], slot: 1, of: 3, color_strategy: measure_match }
          - { id: legal_kpis, region: kpis, kind: cardVisual, purpose: "Quy mô, tỷ lệ hoàn thành và số hạng mục quá hạn", field_bindings: [Eoffice_TD[PL Tổng hạng mục], Eoffice_TD[PL Tỷ lệ hoàn thành], Eoffice_TD[PL Quá hạn]], slot: 2, of: 3, color_strategy: semantic }
          - { id: hr_kpis, region: kpis, kind: cardVisual, purpose: "Kế hoạch, headcount tháng, đang làm việc và đang tuyển", field_bindings: [Head_Count[Executive Kế hoạch headcount 2026], Head_Count[Executive Headcount tháng hiện tại], Head_Count[Executive Đang làm việc], Head_Count[Executive Đang tuyển]], slot: 3, of: 3, color_strategy: semantic }
          - { id: portfolio_status, region: portfolio, kind: barChart, purpose: "Danh mục tập trung ở những hiện trạng đầu tư nào?", field_bindings: { Category: DanhMucDauTu[Hiện trạng đầu tư Executive], Y: DanhMucDauTu[Executive Tổng bản ghi dự án] }, sort_policy: value_desc, color_strategy: measure_match }
          - { id: top_regions, region: regions, kind: barChart, purpose: "Vùng nào có nhiều bản ghi dự án/phân khu nhất?", field_bindings: { Category: DanhMucDauTu[BanDieuHanh], Y: DanhMucDauTu[Executive Top 6 vùng] }, sort_policy: value_desc, color_strategy: measure_match }
          - { id: legal_status, region: legal, kind: barChart, purpose: "Hạng mục pháp lý đang ở trạng thái nào?", field_bindings: { Category: Eoffice_TD[Legal_Status], Y: Eoffice_TD[PL Tổng hạng mục] }, sort_policy: value_desc, color_strategy: semantic }
          - { id: department_progress, region: progress, kind: barChart, purpose: "Phòng ban nào có tiến độ trung bình cao hoặc thấp?", field_bindings: { Category: Eoffice_TD[Phong_Nhom], Y: Eoffice_TD[PL Tiến độ trung bình] }, sort_policy: value_desc, color_strategy: measure_match }
          - { id: hiring_demand, region: hiring, kind: barChart, purpose: "Nhu cầu tuyển tập trung ở phòng ban nào?", field_bindings: { Category: Head_Count[Phòng ban], Y: Head_Count[Executive Top 8 phòng ban đang tuyển] }, sort_policy: value_desc, color_strategy: measure_match }
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: kpis, pct_of_content: 18 }
          balance_rationale: "Dải KPI, hai biểu đồ danh mục và ba khối pháp lý/tiến độ/tuyển dụng lấp đầy canvas mà không tạo vùng chết."
  interaction_pattern:
    drill_targets: ["Khu vực", "Dự án", "Nsu Toàn bộ", "4.1 Thủ tục Pháp lý Dự án"]
    cross_filter_rules: "Power BI default filtering within the page"
  accessibility:
    alt_text_strategy: "chart structure + notable finding"
    contrast_notes: "Navy and body text pass on white/off-white; red and green are paired with labels and values."
  theme:
    base: "existing theme preserved"
    user_overrides: "Do not alter existing report pages or registered resources."
```
