# Report Spec — DASHBOARD TQT

## Mục tiêu

- Đối tượng: quản lý PAS/PTC.
- Theo dõi khối lượng và tiến độ quyết toán theo Khu vực/Dự án và theo PIC.
- Phạm vi giao: PBIP local, không publish Fabric.
- Nguồn dữ liệu: semantic model SharePoint hiện có. `preview (2).html` chỉ là mẫu thiết kế.

## Quy ước nghiệp vụ

- `Số HĐ cần quyết toán`: HĐ có giá trị tại `KPI QUYẾT TOÁN`; riêng nguồn Hồ Tràm thiếu cột KPI nên dùng fallback là HĐ có `NGÀY MỤC TIÊU`.
- Khu vực dùng `Data[Khu vực chuẩn]` để chuẩn hóa Hồ Tràm và suy ra Hồ Tràm từ tên file khi ô khu vực trống.
- `Số HĐ hoàn thành`: HĐ thuộc KPI quyết toán và `TÌNH TRẠNG QUYẾT TOÁN = "Đã quyết toán"`.
- `Kỳ mục tiêu`: năm của `NGÀY MỤC TIÊU`; giá trị trống hiển thị `Chưa có mục tiêu`.
- Trang PIC dùng bảng `Phân công PIC`; một HĐ có hai vai trò PIC được tính thành hai lượt phân công.

## Cấu trúc trang

1. **Tổng quan quyết toán**
   - Rail trái: Kỳ mục tiêu, Khu vực, Dự án/Đơn vị, Tình trạng.
   - Bốn KPI độc lập: tổng HĐ, đã hoàn thành, mục tiêu năm nay, tỷ lệ hoàn thành.
   - Phân bố theo tình trạng và khối lượng theo khu vực.
   - Ba panel dưới: dự án, PIC và tỷ lệ hoàn thành theo khu vực.
   - Hồ Tràm phải hiện trực tiếp ở biểu đồ khu vực khi không bị bộ lọc loại bỏ.

2. **Phân công quyết toán theo PIC**
   - Rail trái: Kỳ mục tiêu, Nhóm PIC, Khu vực, PIC phụ trách.
   - Bar xếp hạng khối lượng theo PIC.
   - Matrix chi tiết bốn KPI theo lượt phân công.

## Thiết kế

- Tone: Light Analytics — Soft Card Workspace.
- Signature: rail trắng bên trái, bốn KPI card có màu riêng, panel trắng bo tròn trên nền `#F4F7FB`.
- Canvas: 1920×1080; rail 264 px; nội dung bắt đầu tại x=296; gutter 16 px.
- Màu: cyan `#2B8FD8`, teal `#0E8F9C`, coral `#E76F51`, green `#1F9D74`, orange `#E39A2F`, red `#D9534F`.
- Font: Segoe UI / Segoe UI Semibold.
- Accessibility: nhãn số bật trên chart; màu không được dùng làm tín hiệu duy nhất.

## Model đã duyệt

- Measures bảng `Data`: `[Số HĐ cần quyết toán]`, `[Số HĐ cần quyết toán (năm nay)]`, `[Số HĐ hoàn thành]`, `[% Hoàn thành]`.
- Bảng `Phân công PIC` và bốn measures theo lượt phân công giữ nguyên.
- Số kiểm tra: 1.053 HĐ cần quyết toán; 207 năm nay; 358 hoàn thành; 34,0%; 1.096 lượt PIC.
- Hồ Tràm: 856 HĐ cần quyết toán; 151 năm nay; 334 hoàn thành; 39,0%.

## Canonical design contract

Thiết kế chi tiết nằm tại `_brief/design-brief.yaml`.

## Điều kiện hoàn thành

- PBIR validate không có lỗi.
- Không có overlap ngoài chủ ý; visual nằm trong canvas.
- Desktop render đủ cả hai trang, hiển thị dữ liệu thật và không có lỗi visual.
