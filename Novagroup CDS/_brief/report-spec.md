# Novagroup CDS — Trang tổng quan điều hành

Trang mới là landing page cho lãnh đạo, trả lời nhanh ba câu hỏi: tiến độ Số hóa/AI đang ở đâu, khối lượng công việc đang tập trung ở trạng thái nào, và những việc quá hạn nào cần ưu tiên. Trang bản đồ tổ chức, tooltip, trang chi tiết, semantic model và theme hiện có được giữ nguyên.

## Canonical design contract

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 1
  mode: brownfield
  design_identity:
    tone: "Corporate cool executive — nền xám xanh nhạt, bề mặt trắng, chữ navy, điểm nhấn cyan và màu trạng thái có tiết chế"
    signature: "Dải KPI viền nhấn bên trái, tiếp nối bằng hai biểu đồ cân đối và bảng ngoại lệ toàn chiều rộng"
    current_tone: "Nova Executive Map — corporate cool, calm, operational"
    current_signature: "Bản đồ tổ chức nền SVG với summary rail navy/cyan và các liên kết chi tiết"
  archetype: Executive
  color_map:
    - measure: Project_a[Measure 4]
      color: "#27B3C5"
      tint: "#E8F8FA"
    - measure: Count(Project[ID])
      color: "#0F4C81"
      tint: "#EAF3FB"
    - measure: Count(Project[ID]) filtered in-progress
      color: "#2F80ED"
      tint: "#EAF3FB"
    - measure: Count(Project[ID]) filtered overdue
      color: "#D64554"
      tint: "#FDECEF"
    - measure: Count(Project[ID]) filtered completed
      color: "#16865A"
      tint: "#E8F6F0"
    - measure: Average(Project[percent])
      color: "#27B3C5"
      tint: "#E8F8FA"
  pages:
    - name: "Tiến độ CDS và các ngoại lệ cần ưu tiên"
      display_name: "Tổng quan"
      role: landing
      archetype: Executive
      layout_variant: B
      variant_rationale: "Có 5 KPI quan trọng tương đương và không có trường thời gian đủ tin cậy để tạo một hero trend; vì vậy KPI-strip cùng hai biểu đồ phân tích là cấu trúc phù hợp nhất."
      page_background: "#F4F7FB"
      layout_summary: "Canvas dọc 1400x1600 giữ đúng kích thước brownfield; một header có slicer tag và nút sang Bản đồ CDS, 5 KPI, hai biểu đồ ngang, bảng việc quá hạn và ghi chú nguồn."
      layout_contract:
        canvas:
          width: 1400
          height: 1600
          margin: 32
          gutter: 24
          snap: 8
        grid:
          columns: 12
          rows: 12
          regions:
            header: [1, 1, 9, 2]
            filters: [9, 1, 13, 2]
            kpis: [1, 2, 13, 4]
            status: [1, 4, 7, 8]
            progress: [7, 4, 13, 8]
            detail: [1, 8, 13, 12]
            footer: [1, 12, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "TIẾN ĐỘ CDS VÀ CÁC NGOẠI LỆ CẦN ƯU TIÊN"
            purpose: "Nêu rõ câu hỏi điều hành của trang ngay khi mở."
          - id: tag_slicer
            region: filters
            kind: slicer
            field_bindings: Project[tag_ids]
            slicer_type: dropdown
            slot: 1
            of: 2
          - id: map_navigation
            region: filters
            kind: shape
            purpose: "Mở trang bản đồ CDS hiện có."
            slot: 2
            of: 2
          - id: overall_progress
            region: kpis
            kind: cardVisual
            purpose: "Tiến độ tổng hợp Số hóa và AI hiện tại là bao nhiêu?"
            field_bindings: Project_a[Measure 4]
            color_strategy: measure_match
            slot: 1
            of: 5
          - id: total_work
            region: kpis
            kind: cardVisual
            purpose: "Có bao nhiêu công việc CDS trong phạm vi lọc?"
            field_bindings: Count(Project[ID])
            color_strategy: measure_match
            slot: 2
            of: 5
          - id: in_progress
            region: kpis
            kind: cardVisual
            purpose: "Có bao nhiêu công việc đang thực hiện?"
            field_bindings: Count(Project[ID])
            filter: "Project[status] = 'Đang thực hiện'"
            color_strategy: semantic
            slot: 3
            of: 5
          - id: overdue
            region: kpis
            kind: cardVisual
            purpose: "Có bao nhiêu công việc quá hạn cần ưu tiên?"
            field_bindings: Count(Project[ID])
            filter: "Project[is_overdue_task] = 'Có'"
            color_strategy: semantic
            slot: 4
            of: 5
          - id: completed
            region: kpis
            kind: cardVisual
            purpose: "Có bao nhiêu công việc đã hoàn thành hoặc đóng?"
            field_bindings: Count(Project[ID])
            filter: "Project[status] IN {'Hoàn thành', 'Đóng'}"
            color_strategy: semantic
            slot: 5
            of: 5
          - id: status_distribution
            region: status
            kind: barChart
            purpose: "Khối lượng công việc đang tập trung ở trạng thái nào?"
            field_bindings:
              Category: Project[status]
              Y: Count(Project[ID])
            sort_policy: value_desc
            color_strategy: measure_match
          - id: progress_by_level
            region: progress
            kind: barChart
            purpose: "Tiến độ bình quân khác nhau như thế nào giữa các cấp công việc?"
            field_bindings:
              Category: Project[deep_level]
              Y: Average(Project[percent])
            sort_policy: natural_order
            color_strategy: measure_match
          - id: overdue_detail
            region: detail
            kind: tableEx
            purpose: "Những công việc quá hạn nào đang có tiến độ thấp và cần được rà soát trước?"
            field_bindings:
              - Project[title]
              - Project[end_plan]
              - Average(Project[percent])
              - Project[status]
            filter: "Project[is_overdue_task] = 'Có'"
            sort_policy: value_asc
          - id: source_note
            region: footer
            kind: textbox
            text: "Nguồn: semantic model Novagroup CDS · Bộ lọc tag áp dụng cho toàn trang."
        space_audit:
          content_cell_count: 132
          placed_cell_count: 132
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region:
            name: detail
            pct_of_content: 36
          balance_rationale: "KPI chiếm một dải gọn; hai biểu đồ có diện tích bằng nhau; bảng ngoại lệ được ưu tiên chiều cao để phục vụ hành động và không tạo dải trống cuối trang."
  interaction_pattern:
    drill_targets:
      - "Novagroup"
      - "Chi tiết"
    cross_filter_rules: "Giữ tương tác mặc định; slicer tag lọc toàn trang, các biểu đồ có thể cross-filter bảng và KPI."
  accessibility:
    alt_text_strategy: "Mỗi KPI nêu giá trị và bối cảnh; biểu đồ nêu câu hỏi so sánh; bảng nêu rõ đây là danh sách quá hạn."
    contrast_notes: "Navy #102A43 trên trắng và nền #F4F7FB đạt tương phản đọc; màu đỏ/xanh luôn đi cùng nhãn văn bản và số."
  theme:
    base: "existing Nova Executive Map theme preserved"
    user_overrides: "Không đổi theme, SVG bản đồ, bookmark, tooltip, chi tiết hoặc semantic model."
```

## Delivery boundary

- Thêm đúng một trang hiển thị tên `Tổng quan`, đặt đầu danh sách trang và mở mặc định.
- Không thay đổi dữ liệu, Power Query, quan hệ, measures hoặc theme.
- Không thay đổi các visual id/bookmark/link đang có trên trang `Novagroup`.
- Sau authoring phải chạy validator, reload Power BI Desktop và kiểm tra ảnh chụp ở kích thước thật.
