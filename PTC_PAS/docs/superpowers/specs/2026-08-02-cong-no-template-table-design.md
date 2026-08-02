# Thiết kế bảng Công nợ theo template

Ngày duyệt thiết kế: 2026-08-02  
PBIP: `DASHBOARD TQT.pbip`  
Template tham chiếu: `Template công nợ_Build dashboard.xlsx`

## Mục tiêu

Giữ nguyên các KPI, biểu đồ và bộ lọc đang có trên trang **Công nợ**. Thay matrix chi tiết hiện tại bằng một matrix Power BI tái tạo đúng cấu trúc nghiệp vụ của template: đủ 23 cột A–W, đúng thứ tự, đúng tên hiển thị, đúng nhóm chỉ tiêu, đúng công thức (1)–(12), có tổng cộng và hỗ trợ drill-down.

## Phương án đã cân nhắc

1. **Matrix có drill-down và dải tiêu đề nhóm — được chọn.** Giữ được tổng/subtotal, drill Nhà thầu → Khu vực → Dự án → Hợp đồng và đặt các measure đúng thứ tự template. Bảng dùng cuộn ngang vì 23 cột không thể đọc rõ cùng lúc trong vùng 1.592 px.
2. **Table phẳng.** Dễ khớp thứ tự cột nhưng mất drill-down và subtotal theo cấp; không đáp ứng nhu cầu đã chốt.
3. **Trang chi tiết riêng toàn màn hình.** Đọc dễ hơn nhưng thay đổi kiến trúc trang; người dùng đã chọn giữ KPI và biểu đồ trên trang hiện tại.

## Phạm vi thay đổi

- Chỉ tái cấu trúc khu vực bảng chi tiết của trang `Công nợ`.
- Giữ nguyên 6 slicer, 5 KPI card và 2 biểu đồ xếp hạng.
- Không thay đổi nguồn SharePoint hoặc logic refresh.
- Bổ sung tối thiểu các measure hiển thị còn thiếu để matrix có thể đặt hai cột trạng thái ở cuối bảng.
- Matrix dùng bảy trường A–G trong `Rows`, tắt stepped layout để mỗi cấp có cột riêng; H–W nằm trong `Values` theo đúng thứ tự. Hai cột trạng thái V–W dùng measure `SELECTEDVALUE` để nằm sau các chỉ tiêu tiền thay vì bị đẩy sang đầu hierarchy.
- Giữ nguyên hai trang `Tổng quan quyết toán` và `Phân công quyết toán theo PIC`.

## Ánh xạ 23 cột A–W

| Cột | Nhãn template | Trường/measure Power BI | Nhóm |
|---|---|---|---|
| A | NT/NCC/TV | `Data[NT/NCC/TV ]` | Thông tin hợp đồng |
| B | KHU VỰC | `Data[Khu vực chuẩn]` | Thông tin hợp đồng |
| C | DỰ ÁN | `Data[TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ]` | Thông tin hợp đồng |
| D | PHÁP NHÂN KÝ HĐ | `Data[PHÁP NHÂN KÝ HĐ/PLHĐ]` | Thông tin hợp đồng |
| E | SỐ HỢP ĐỒNG GỐC | `Data[SỐ HỢP ĐỒNG CHÍNH]` | Thông tin hợp đồng |
| F | NỘI DUNG GÓI THẦU | `Data[NỘI DUNG HỢP ĐỒNG]` | Thông tin hợp đồng |
| G | NGÀY KÝ HĐ | `Data[NGÀY KÝ HĐ]` | Thông tin hợp đồng |
| H | GIÁ TRỊ HĐ+PS GỒM VAT | `[Giá trị HĐ + PS gồm VAT]` | Giá trị nguồn |
| I | GIÁ TRỊ HÓA ĐƠN (CHƯA GỒM VAT) | `[Giá trị hóa đơn chưa VAT]` | Giá trị nguồn |
| J | GIÁ TRỊ HÓA ĐƠN (GỒM VAT) — (1) | `[Giá trị hóa đơn gồm VAT]` | Giá trị nguồn |
| K | GIÁ TRỊ TẠM ỨNG — (2) | `[Giá trị tạm ứng]` | Theo dõi tạm ứng |
| L | KHẤU TRỪ TẠM ỨNG — (3) | `[(3) Khấu trừ tạm ứng]` | Theo dõi tạm ứng |
| M | GIÁ TRỊ TẠM ỨNG CHƯA THU HỒI — (4)=(2)-(3) | `[(4) Tạm ứng chưa thu hồi]` | Theo dõi tạm ứng |
| N | GIÁ TRỊ CÔNG NỢ ĐÃ CÓ CPC GỒM TẠM ỨNG + WD — (5) | `[(5) Công nợ đã có CPC]` | Công nợ theo CPC |
| O | GIÁ TRỊ ĐÃ THANH TOÁN GỒM ỨNG + WD — (6) | `[(6) Đã thanh toán]` | Công nợ theo CPC |
| P | GIÁ TRỊ SWAP — (7) | `[(7) Giá trị Swap]` | Công nợ theo CPC |
| Q | CÔNG NỢ CPC CÒN LẠI CHƯA THANH TOÁN — (8)=(5)-(6)-(7) | `[(8) Công nợ CPC còn lại]` | Công nợ theo CPC |
| R | CÔNG NỢ SAU KHI TRỪ TẠM ỨNG CHƯA THU HỒI — (9)=(8)-(4) | `[(9) Công nợ sau trừ tạm ứng]` | Công nợ theo CPC |
| S | TỔNG NỢ PHẢI TRẢ — (10)=(1)-(6)-(7) | `[(10) Tổng nợ phải trả]` | Công nợ theo hóa đơn |
| T | TIỀN BẢO HÀNH GIỮ LẠI — (11) | `[(11) Tiền bảo hành giữ lại]` | Công nợ theo hóa đơn |
| U | TỔNG CÒN LẠI PHẢI TRẢ — (12)=(10)-(11) | `[(12) Tổng còn lại phải trả]` | Công nợ theo hóa đơn |
| V | Tình trạng HĐ | measure dòng lấy `Data[TÌNH TRẠNG THỰC HIỆN HĐ]` | Trạng thái |
| W | TÌNH TRẠNG QUYẾT TOÁN | measure dòng lấy `Data[Tình trạng quyết toán (chuẩn)]` | Trạng thái |

## Hành vi và định dạng

- Cấp drill mặc định: **Nhà thầu → Khu vực → Dự án → Pháp nhân → Hợp đồng → Nội dung → Ngày ký**.
- Matrix dùng layout nhiều cột, hỗ trợ expand/collapse và subtotal ở cấp Nhà thầu/Khu vực/Dự án.
- Dòng tổng cộng hiển thị các chỉ tiêu cộng được; hai cột trạng thái để trống tại subtotal/total khi có nhiều giá trị.
- Thứ tự measure H–U không được thay đổi.
- Giá trị tiền hiển thị `#,##0;[Red]-#,##0;-`; số âm vừa có dấu trừ vừa dùng màu đỏ.
- Text căn trái; ngày và trạng thái căn giữa; số căn phải.
- Header cột đậm, wrap, font tối thiểu 9 pt. Vùng dữ liệu có row banding nhẹ và đường phân cách mảnh.
- Dải nhóm **Theo dõi tạm ứng** dùng vàng nhạt, **Công nợ theo CPC** dùng xanh dương nhạt, **Công nợ theo hóa đơn** dùng xanh lá nhạt; mỗi dải có nhãn văn bản nên màu không phải tín hiệu duy nhất.
- Matrix giữ chiều cao phần còn lại của canvas; người dùng cuộn ngang để xem đủ 23 cột. Các trường định danh nằm bên trái để giữ ngữ cảnh khi drill.

## Design Brief

```yaml
Design Brief:
  generated_by: powerbi-report-design
  contract_version: 1
  mode: brownfield
  design_identity:
    current_tone: "dashboard vận hành sáng, gọn, dùng accent card và filter rail bên trái"
    current_signature: "filter rail cố định bên trái và dải KPI card có màu nhận diện"
    tone: "dashboard vận hành sáng, chính xác như bảng kiểm soát công nợ"
    signature: "matrix chi tiết có ba dải nhóm màu bám template Excel"
  archetype: Analytical
  color_map:
    - measure: "Data[(4) Tạm ứng chưa thu hồi]"
      color: "#B58A00"
      tint: "#FFFF00"
    - measure: "Data[(8) Công nợ CPC còn lại]"
      color: "#2563EB"
      tint: "#9BC2E6"
    - measure: "Data[(9) Công nợ sau trừ tạm ứng]"
      color: "#2563EB"
      tint: "#9BC2E6"
    - measure: "Data[(10) Tổng nợ phải trả]"
      color: "#3F7D20"
      tint: "#A9D18E"
    - measure: "Data[(11) Tiền bảo hành giữ lại]"
      color: "#3F7D20"
      tint: "#A9D18E"
    - measure: "Data[(12) Tổng còn lại phải trả]"
      color: "#3F7D20"
      tint: "#A9D18E"
  pages:
    - name: "Công nợ theo nhà thầu và hợp đồng"
      role: detail
      archetype: Analytical
      layout_variant: A
      variant_rationale: "Trang có 6 slicer và cần tra cứu 23 cột nên filter rail và matrix detail là cấu trúc phù hợp nhất."
      page_background: "#F4F7FB"
      layout_summary: "Giữ filter rail, KPI strip và hai biểu đồ; thay khu vực cuối trang bằng matrix 23 cột có dải nhóm theo template."
      layout_contract:
        canvas: { width: 1920, height: 1080, margin: 24, gutter: 16, snap: 8 }
        grid:
          columns: 12
          rows: 12
          regions:
            rail:          [1, 1, 3, 13]
            header:        [3, 1, 13, 2]
            kpis:          [3, 2, 13, 4]
            charts:        [3, 4, 13, 7]
            detail_header: [3, 7, 13, 8]
            detail:        [3, 8, 13, 13]
        placements:
          - id: page_title
            region: header
            kind: textbox
            text: "Công nợ theo nhà thầu và hợp đồng"
          - id: filter_rail
            region: rail
            kind: slicer_group
            purpose: "Lọc Nhà thầu, Khu vực, Dự án, Pháp nhân, Tình trạng HĐ và Tình trạng quyết toán."
            field_bindings:
              - "Data[NT/NCC/TV ]"
              - "Data[Khu vực chuẩn]"
              - "Data[TÊN VIẾT TẮT DỰ ÁN/ĐƠN VỊ]"
              - "Data[PHÁP NHÂN KÝ HĐ/PLHĐ]"
              - "Data[TÌNH TRẠNG THỰC HIỆN HĐ]"
              - "Data[Tình trạng quyết toán (chuẩn)]"
          - id: existing_kpis
            region: kpis
            kind: cardVisual_group
            purpose: "Giữ nguyên năm KPI công nợ hiện tại."
            field_bindings:
              - "Data[(8) Công nợ CPC còn lại (tỷ)]"
              - "Data[(9) Công nợ sau trừ tạm ứng (tỷ)]"
              - "Data[(10) Tổng nợ phải trả (tỷ)]"
              - "Data[(11) Tiền bảo hành giữ lại (tỷ)]"
              - "Data[(12) Tổng còn lại phải trả (tỷ)]"
          - id: existing_rankings
            region: charts
            kind: barChart_group
            purpose: "Giữ nguyên xếp hạng công nợ theo Khu vực và Nhà thầu."
            field_bindings:
              - "Data[Khu vực chuẩn] x Data[(12) Tổng còn lại phải trả (tỷ)]"
              - "Data[NT/NCC/TV ] x Data[(12) Tổng còn lại phải trả (tỷ)]"
            sort_policy: value_desc
            color_strategy: measure_match
          - id: debt_group_headers
            region: detail_header
            kind: shape_text_group
            purpose: "Thể hiện ba nhóm nghiệp vụ và công thức (1)–(12) như template."
            field_bindings: "none"
            color_strategy: semantic
          - id: debt_detail_matrix
            region: detail
            kind: pivotTable
            purpose: "Tra cứu và drill từ Nhà thầu/Khu vực/Dự án xuống từng hợp đồng với đủ 23 cột A–W."
            field_bindings: "Theo bảng ánh xạ 23 cột A–W trong tài liệu này."
            sort_policy: natural_order
            color_strategy: semantic
        space_audit:
          content_cell_count: 110
          placed_cell_count: 110
          empty_cell_pct: 0
          unplaced_regions: []
          largest_region: { name: detail, pct_of_content: 45.5 }
          balance_rationale: "Matrix là vùng tra cứu chính; KPI và hai biểu đồ vẫn đủ chiều cao, không có dải trống cuối trang."
  interaction_pattern:
    drill_targets: "Matrix tự expand/collapse theo hierarchy; không tạo trang drillthrough mới."
    cross_filter_rules: "Slicer lọc toàn trang; hai bar chart tiếp tục cross-filter matrix."
  accessibility:
    alt_text_strategy: "Mô tả bảng 23 cột, hierarchy đang mở và các nhóm chỉ tiêu công nợ."
    contrast_notes: "Chữ đen trên vàng/xanh nhạt đạt tương phản; số âm dùng cả dấu trừ và màu đỏ; tab order đi từ filter rail đến KPI, charts, rồi matrix."
  theme:
    base: "existing theme preserved"
    user_overrides: "Không đổi theme toàn báo cáo; chỉ áp dụng màu nhóm và định dạng matrix theo template."
```

## Tiêu chí nghiệm thu

1. Matrix hiển thị đủ 23 cột A–W và đúng thứ tự trong template.
2. Nhãn cột, nhóm màu và công thức (1)–(12) khớp template.
3. Drill-down, subtotal và total hoạt động theo hierarchy đã nêu.
4. Tổng các measure H–U khớp kết quả DAX hiện tại; kiểm tra riêng các công thức (4), (8), (9), (10), (12).
5. Số âm có dấu trừ và màu đỏ; không dùng màu như tín hiệu duy nhất.
6. KPI, biểu đồ và slicer hiện hữu không bị mất hoặc đổi logic.
7. `powerbi-report-author validate` trả về 0 lỗi và 0 cảnh báo.
8. Power BI Desktop reload thành công và ảnh chụp trang không có overlap, header bị cắt hoặc bảng trắng/lỗi.

## Giới hạn đã chấp nhận

- Bảng 23 cột cần cuộn ngang trong Power BI; đây là lựa chọn đã được người dùng duyệt để giữ KPI và biểu đồ trên cùng trang.
- Power BI không tái tạo mọi hành vi trình bày của Excel theo từng pixel. Tiêu chí “giống template” được hiểu là giống đầy đủ về cấu trúc cột, thứ tự, nhóm nghiệp vụ, công thức, tổng, màu nhóm và logic drill; phần chrome vẫn theo chuẩn Power BI hiện tại.
