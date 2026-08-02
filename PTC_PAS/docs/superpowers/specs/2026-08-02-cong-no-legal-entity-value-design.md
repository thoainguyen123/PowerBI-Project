# Điều chỉnh Pháp nhân thành Value trong matrix Công nợ

## Mục tiêu

Chuyển `PHÁP NHÂN KÝ HĐ/PLHĐ` khỏi hierarchy Rows sang Values của matrix Công nợ. Pháp nhân chỉ hiển thị tại cấp `SỐ HỢP ĐỒNG CHÍNH`, đồng nhất với cách hiển thị `Nội dung gói thầu` và `Ngày ký HĐ` hiện tại.

## Phạm vi

Thay đổi chỉ áp dụng cho matrix chi tiết trên trang Công nợ và các thành phần nguồn dùng để tái tạo, kiểm tra matrix này. Không thay đổi slicer Pháp nhân, dữ liệu nguồn, các KPI hoặc biểu đồ khác.

## Cấu trúc matrix sau thay đổi

### Rows

1. Nhà thầu/Nhà cung cấp/Tư vấn.
2. Khu vực chuẩn.
3. Tên viết tắt Dự án/Đơn vị.
4. Số Hợp đồng Gốc (`Data[SỐ HỢP ĐỒNG CHÍNH]`).

### Values

Ba cột thông tin hợp đồng đứng đầu Values theo thứ tự:

1. Pháp nhân ký HĐ.
2. Nội dung gói thầu.
3. Ngày ký HĐ.

Các chỉ tiêu giá trị, công nợ và trạng thái hiện có giữ nguyên thứ tự phía sau. Tổng số Values sau thay đổi là 19.

## Measure Pháp nhân

Tạo measure text trong bảng `Data`:

```DAX
Pháp nhân ký HĐ (dòng) =
IF (
    ISINSCOPE ( Data[SỐ HỢP ĐỒNG CHÍNH] ),
    SELECTEDVALUE ( Data[PHÁP NHÂN KÝ HĐ/PLHĐ] )
)
```

Measure có `formatString: @`, nằm trong display folder `Công nợ\04. Hiển thị bảng` và có lineage tag riêng.

Hành vi mong đợi:

- Hiện Pháp nhân ở dòng cấp Số Hợp đồng Gốc.
- Trả `BLANK()` tại subtotal Nhà thầu, Khu vực, Dự án và grand total.
- Nếu một Số Hợp đồng Gốc có nhiều Pháp nhân trong cùng filter context, `SELECTEDVALUE` trả `BLANK()` để bộc lộ dữ liệu không nhất quán thay vì tự chọn một giá trị.

## Thay đổi kỹ thuật

1. `Data.tmdl`: thêm measure `Pháp nhân ký HĐ (dòng)`.
2. Matrix `c3000000000000000014`:
   - Bỏ cột nguồn `PHÁP NHÂN KÝ HĐ/PLHĐ` khỏi Rows.
   - Thêm measure mới ở đầu Values với nhãn `PHÁP NHÂN KÝ HĐ`.
3. `build-cong-no-page.mjs`: cập nhật cấu hình sinh matrix để lần build sau không hoàn tác thay đổi.
4. `verify-cong-no-template.mjs`: cập nhật kỳ vọng thành 4 Rows, 19 Values và kiểm tra measure mới có đúng `ISINSCOPE`.

## Kiểm chứng

1. Chạy verifier của trang Công nợ và yêu cầu kết quả PASS.
2. Chạy `powerbi-report-author validate` trên thư mục report và yêu cầu 0 lỗi.
3. Nạp lại PBIP trong Power BI Desktop và chụp trang Công nợ.
4. Xác nhận trực quan:
   - Pháp nhân là cột Value đứng trước Nội dung và Ngày ký.
   - Rows kết thúc tại Số Hợp đồng Gốc.
   - Pháp nhân trống ở subtotal và grand total.
   - Không phát sinh lỗi visual, chồng lấn hoặc thay đổi ngoài phạm vi.

## Ngoài phạm vi

- Không ghép nhiều Pháp nhân thành chuỗi.
- Không dùng `FIRSTNONBLANK` để che trường hợp một hợp đồng có nhiều Pháp nhân.
- Không thay đổi bộ lọc Pháp nhân hoặc logic tính công nợ.
