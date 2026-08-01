# Report Spec — DASHBOARD TQT 2026

## Mục tiêu nghiệp vụ

- Báo cáo số lượng quyết toán theo khu vực và dự án.
- Tracking tình trạng quyết toán của các hợp đồng có ngày mục tiêu năm 2026.
- So sánh tình trạng quyết toán 2026 giữa các khu vực.
- Tracking khối lượng theo từng PIC từ cột AK và AL.
- Theo dõi công nợ theo nhà thầu và khu vực, từ tổng quan đến chi tiết hợp đồng.

## Định nghĩa KPI đã kiểm tra

- `(1) Số HĐ cần quyết toán`: `Năm mục tiêu` không trống.
- `(2) Số HĐ cần quyết toán 2026`: `Năm mục tiêu = [Năm báo cáo]`, hiện là 2026.
- `(2.1) KPI đã đăng ký`: thuộc `(2)` và `KPI QUYẾT TOÁN = KPI 417`.
- `(2.2) Đăng ký thêm`: thuộc `(2)` và `KPI QUYẾT TOÁN = Ngoài 417`.
- `(2.3) Chưa phân loại`: phần còn lại để cân đối `(2)`.
- `(3) Hoàn thành 2026`: thuộc `(2)` và năm ký biên bản quyết toán từ 2026 trở đi.
- `% Hoàn thành theo KPI đã đăng ký`: `(3)/(2.1)` theo yêu cầu; có thể vượt 100%.
- `% Hoàn thành 2026`: `(3)/(2)`.
- `Giá trị đã quyết toán 2026`: tổng `GIÁ TRỊ WORKDONE (GỒM VAT)` của các dòng thuộc `(3)`.
- Bảng PIC dùng một dòng cho mỗi lượt AK hoặc AL. Một hợp đồng có cả hai PIC xuất hiện hai lượt.

## Kết quả kiểm tra dữ liệu ngày 30/07/2026

- Tổng dòng dữ liệu: 18.222.
- `(1)`: 2.441 hợp đồng.
- `(2)`: 764 hợp đồng.
- `(2.1)`: 134; `(2.2)`: 303; `(2.3)`: 327; cân đối bằng 0.
- `(3)`: 88 hợp đồng.
- `% Hoàn thành theo KPI đã đăng ký`: 65,7%.
- `% Hoàn thành 2026`: 11,5%.
- Giá trị đã quyết toán 2026: 1.840.708.588.808,52.
- PIC: 2.591 lượt ở `(1)`, 828 lượt ở `(2)`, 89 lượt ở `(3)`.

## Thiết kế báo cáo

### Trang Tổng quan quyết toán

- Sidebar: kỳ mục tiêu, khu vực chuẩn, dự án/đơn vị và tình trạng chuẩn hóa.
- KPI cards: `(1)`, `(2)`, `(3)` và `% Hoàn thành 2026`.
- Donut: tình trạng quyết toán, dùng `(2)` nên luôn giới hạn ngày mục tiêu 2026.
- Stacked column: khu vực chuẩn trên trục X, tình trạng chuẩn hóa ở legend, `(2)` ở value.
- Matrix: `Khu vực chuẩn → Dự án/Đơn vị` với toàn bộ KPI `(1)–(3)`, gồm cả cột ngoại lệ `(2.3)`, hai tỷ lệ và giá trị.

### Trang Phân công quyết toán theo PIC

- Sidebar: kỳ mục tiêu, nhóm PIC, khu vực và PIC.
- Bar chart: `(2) Số lượt cần quyết toán 2026` theo PIC.
- Matrix: `Nhóm PIC → PIC phụ trách`, gồm toàn bộ KPI PIC, cột ngoại lệ `(2.3)` và giá trị.
- Ghi chú rõ AK = Xây dựng/Cung ứng, AL = MEP và cảnh báo tổng giá trị có thể cộng trùng.

### Trang Công nợ

- Sidebar: nhà thầu, khu vực chuẩn, dự án/đơn vị, pháp nhân ký hợp đồng, tình trạng hợp đồng và tình trạng quyết toán.
- KPI cards: `(8) Công nợ CPC còn lại`, `(9) Công nợ sau trừ tạm ứng`, `(10) Tổng nợ phải trả`, `(11) Tiền bảo hành giữ lại`, `(12) Tổng còn lại phải trả`.
- Bar chart theo khu vực và nhà thầu: xếp hạng theo `(12) Tổng còn lại phải trả`.
- Matrix chi tiết: `Khu vực → Dự án/Đơn vị → Nhà thầu → Số hợp đồng`, kèm các chỉ tiêu `(4)`, `(8)–(12)`.
- Quy ước mapping dùng semantic model hiện tại: `TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ` là Dự án/Đơn vị; `PHÁP NHÂN KÝ HĐ/PLHĐ` là Pháp nhân ký HĐ; cột Workdone được dùng theo nhãn Hóa đơn trong template.

## Canonical design contract

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 4
  mode: brownfield
  archetype: "Executive Summary + Analytical Detail"
  reference:
    file: "C:\\Users\\Admin\\Downloads\\bao_cao_tqt_dashboard.html"
    usage: "Tham chiếu chrome và palette; nghiệp vụ theo yêu cầu TQT 2026."
  theme:
    name: "LightAnalytics-TQT2026-4f8c2d71.json"
    canvas: "#F4F7FB"
    surface: "#FFFFFF"
    ink: "#172033"
    muted: "#6B7A90"
    accent: "#2B8FD8"
    semantic_colors:
      completed: "#1F9D74"
      in_progress: "#2B8FD8"
      pending: "#E39A2F"
      risk: "#E76F51"
      cancelled: "#D9534F"
      neutral: "#AEB9C7"
    exclusions:
      - "Không dùng màu tím."
  pages:
    - name: "Tổng quan quyết toán"
      canvas: { width: 1720, height: 1190 }
      layout:
        sidebar: [0, 0, 264, 1190]
        header: [296, 12, 1390, 76]
        kpis: [296, 112, 1390, 152]
        donut_2026: [296, 288, 685, 336]
        stacked_status_region: [1002, 288, 685, 336]
        region_project_matrix: [296, 642, 1390, 513]
      bindings:
        cards:
          - "Data[(1) Số HĐ cần quyết toán]"
          - "Data[(2) Số HĐ cần quyết toán 2026]"
          - "Data[(3) Số HĐ hoàn thành 2026]"
          - "Data[% Hoàn thành 2026]"
        donut:
          category: "Data[Tình trạng quyết toán (chuẩn)]"
          value: "Data[(2) Số HĐ cần quyết toán 2026]"
        stacked_column:
          category: "Data[Khu vực chuẩn]"
          series: "Data[Tình trạng quyết toán (chuẩn)]"
          value: "Data[(2) Số HĐ cần quyết toán 2026]"
    - name: "Phân công quyết toán theo PIC"
      canvas: { width: 1920, height: 1080 }
      layout:
        sidebar: [0, 0, 264, 1080]
        ranking: [296, 112, 1592, 432]
        pic_matrix: [296, 568, 1592, 480]
      bindings:
        ranking:
          category: "Phân công PIC[PIC phụ trách]"
          value: "Phân công PIC[(2) Số lượt cần quyết toán 2026]"
        matrix_rows:
          - "Phân công PIC[Nhóm PIC]"
          - "Phân công PIC[PIC phụ trách]"
    - name: "Công nợ"
      role: "detail"
      archetype: "Analytical"
      layout_variant: "A"
      variant_rationale: "Sáu chiều lọc nghiệp vụ cần hiển thị đồng thời nên filter rail được lấp đầy hơn 50% chiều cao; phần nội dung dành cho KPI, hai bảng xếp hạng và matrix chi tiết."
      canvas: { width: 1920, height: 1080, margin: 24, gutter: 16, snap: 8 }
      page_background: "#F4F7FB"
      layout_contract:
        regions:
          sidebar: [0, 0, 264, 1080]
          header: [296, 24, 1592, 64]
          kpis: [296, 112, 1592, 128]
          region_ranking: [296, 264, 784, 280]
          contractor_ranking: [1096, 264, 792, 280]
          detail: [296, 568, 1592, 480]
        placements:
          - { id: "page_title", region: "header", kind: "textbox", text: "Công nợ còn lại cần thanh toán" }
          - { id: "debt_kpis", region: "kpis", kind: "cardVisual", purpose: "Năm chỉ tiêu công nợ trọng yếu", field_bindings: ["Data[(8) Công nợ CPC còn lại]", "Data[(9) Công nợ sau trừ tạm ứng]", "Data[(10) Tổng nợ phải trả]", "Data[(11) Tiền bảo hành giữ lại]", "Data[(12) Tổng còn lại phải trả]"] }
          - { id: "region_debt", region: "region_ranking", kind: "barChart", purpose: "Khu vực nào còn phải trả nhiều nhất?", field_bindings: { Category: "Data[Khu vực chuẩn]", Y: "Data[(12) Tổng còn lại phải trả]" }, sort_policy: "value_desc", color_strategy: "measure_match" }
          - { id: "contractor_debt", region: "contractor_ranking", kind: "barChart", purpose: "Nhà thầu nào còn phải trả nhiều nhất?", field_bindings: { Category: "Data[NT/NCC/TV]", Y: "Data[(12) Tổng còn lại phải trả]" }, sort_policy: "value_desc", color_strategy: "measure_match" }
          - { id: "debt_detail", region: "detail", kind: "pivotTable", purpose: "Hợp đồng nào cấu thành công nợ còn lại?", field_bindings: ["Data[Khu vực chuẩn]", "Data[TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ]", "Data[NT/NCC/TV]", "Data[SỐ HỢP ĐỒNG CHÍNH]", "Data[(4) Tạm ứng chưa thu hồi]", "Data[(8) Công nợ CPC còn lại]", "Data[(9) Công nợ sau trừ tạm ứng]", "Data[(10) Tổng nợ phải trả]", "Data[(11) Tiền bảo hành giữ lại]", "Data[(12) Tổng còn lại phải trả]"] }
        space_audit:
          content_cell_count: 120
          placed_cell_count: 120
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: "detail", pct_of_content: 42 }
          balance_rationale: "Matrix nhận vùng lớn nhất vì cần tra cứu tới hợp đồng; KPI và hai ranking đủ cao để đọc nhưng không lấn át phần chi tiết."
      color_map:
        - { measure: "Data[(8) Công nợ CPC còn lại]", color: "#2B8FD8" }
        - { measure: "Data[(9) Công nợ sau trừ tạm ứng]", color: "#0E8F9C" }
        - { measure: "Data[(10) Tổng nợ phải trả]", color: "#E39A2F" }
        - { measure: "Data[(11) Tiền bảo hành giữ lại]", color: "#4F6D8A" }
        - { measure: "Data[(12) Tổng còn lại phải trả]", color: "#E76F51" }
  accessibility:
    strategy: "Nhãn dữ liệu và legend bổ sung cho màu; alt text mô tả điều kiện năm 2026."
  delivery:
    target: "Local PBIP"
    semantic_model_changes: true
    publish_fabric: false
```

## Điều kiện hoàn thành

- PBIR validate 0 lỗi và 0 cảnh báo.
- Card và bảng khớp kết quả truy vấn DAX.
- Donut và stacked column chỉ dùng mục tiêu 2026.
- Hồ Tràm dùng `Khu vực chuẩn` và hiển thị trong chart/matrix.
- Không có màu tím trong theme đang active.
- Trang Công nợ hiển thị dữ liệu thực tế, measure `(4)`, `(8)–(12)` trả về số và các biểu đồ/matrix không lỗi.
