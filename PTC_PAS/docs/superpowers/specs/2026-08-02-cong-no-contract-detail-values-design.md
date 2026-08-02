# Điều chỉnh Nội dung gói thầu và Ngày ký HĐ trong matrix Công nợ

Ngày duyệt thiết kế: 2026-08-02  
PBIP: `DASHBOARD TQT.pbip`  
Trang: `Công nợ`

## Mục tiêu

Hai cột `NỘI DUNG GÓI THẦU` và `NGÀY KÝ HĐ` phải là Values của matrix, không phải cấp hierarchy trong Rows. Chúng chỉ hiển thị tại cấp `SỐ HỢP ĐỒNG GỐC` và để trống tại các dòng tổng cấp Nhà thầu, Khu vực, Dự án và Pháp nhân.

## Ánh xạ trường

- Nhãn `SỐ HỢP ĐỒNG GỐC` dùng cột model `Data[SỐ HỢP ĐỒNG CHÍNH]`.
- `NỘI DUNG GÓI THẦU` lấy từ `Data[NỘI DUNG HỢP ĐỒNG]`.
- `NGÀY KÝ HĐ` lấy từ `Data[NGÀY KÝ HĐ]` và hiển thị theo định dạng `dd/MM/yyyy`.

## Cấu trúc matrix

Rows chỉ gồm năm cấp:

1. Nhà thầu/NCC/TV.
2. Khu vực.
3. Dự án/Đơn vị.
4. Pháp nhân ký hợp đồng.
5. Số hợp đồng gốc.

Values bắt đầu bằng hai measure hiển thị sau đây, rồi mới đến các measure tiền H–U và hai measure trạng thái V–W:

1. `Nội dung gói thầu (dòng)`.
2. `Ngày ký HĐ (dòng)`.

Tổng số cột hiển thị vẫn là 23 cột A–W và thứ tự nhãn không thay đổi so với template.

## Logic DAX

```DAX
Nội dung gói thầu (dòng) =
IF (
    ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),
    SELECTEDVALUE ( Data[NỘI DUNG HỢP ĐỒNG] )
)

Ngày ký HĐ (dòng) =
IF (
    ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),
    SELECTEDVALUE ( Data[NGÀY KÝ HĐ] )
)
```

Không dùng trực tiếp hai cột nguồn trong Values vì Power BI sẽ áp dụng phép tổng hợp ngầm và không đảm bảo hành vi tại subtotal/total.

## Tiêu chí nghiệm thu

1. Matrix có đúng năm trường trong Rows, kết thúc tại `SỐ HỢP ĐỒNG GỐC`.
2. `NỘI DUNG GÓI THẦU` và `NGÀY KÝ HĐ` nằm trong Values ngay sau các trường Rows.
3. Cả hai measure có `ISINSCOPE(Data[SỐ HỢP ĐỒNG CHÍNH])`.
4. Hai giá trị chỉ xuất hiện ở cấp hợp đồng gốc và trống tại subtotal/total cấp cao hơn.
5. Ngày hiển thị theo `dd/MM/yyyy`.
6. Matrix vẫn đủ 23 cột A–W; các KPI, biểu đồ và slicer khác không thay đổi.
7. PBIR validate không có lỗi hoặc cảnh báo và ảnh chụp Desktop không có visual lỗi.

## Ngoài phạm vi

- Không thay đổi công thức các measure công nợ (1)–(12).
- Không thay đổi nguồn dữ liệu hoặc Power Query.
- Không đổi bố cục KPI, biểu đồ và slicer của trang.
