# NVL Data Hub

Cổng nhập liệu dùng chung cho dữ liệu Nhân sự và Tổng quan dự án của báo cáo
`NVLG_PROJECT`.

## Phạm vi

- Nhân sự: hồ sơ, phân bổ dự án, nhân sự chung, cấu hình phòng ban, luân chuyển
  và đánh giá.
- Tổng quan dự án: thêm/sửa, tìm kiếm, lọc, kiểm tra độ đầy đủ dữ liệu và xuất
  workbook cho Power BI.
- Công việc và Danh mục đầu tư: không xây lại trong ứng dụng này.

## Mapping Power BI

File xuất `Template_Nhap_Lieu_Master_Data_Du_An.xlsx` có sheet
`Tổng quan dự án` với các cột:

1. Mã dự án
2. Tên pháp lý dự án
3. Tên thương mại
4. Chủ đầu tư
5. Địa điểm dự án
6. Tổng diện tích (ha)
7. Số lượng sản phẩm
8. Nguồn gốc dự án

Đây là schema của bảng `Tổng quan dự án` trong semantic model
`NVLG PROJECTS.SemanticModel`.

## Chạy bằng Docker

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Ứng dụng chạy tại `http://localhost:5000`.

## Chạy trực tiếp

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env   # rồi điền SECRET_KEY và mật khẩu thật
$env:USE_POSTGRES = "false"
python app.py
```

Ứng dụng bắt buộc phải có `SECRET_KEY` (và `DB_PASSWORD` khi `USE_POSTGRES=true`);
thiếu thì dừng ngay thay vì chạy bằng giá trị mặc định đoán được.

Mặc định server chỉ nghe trên `127.0.0.1` và **tắt** chế độ debug. Chỉ đặt
`FLASK_DEBUG=true` khi tự debug trên máy cá nhân — debugger của Werkzeug cho phép
thực thi code tùy ý từ trình duyệt, không được bật ở môi trường dùng chung.

Khi khởi động, ứng dụng tự bổ sung các cột Tổng quan dự án còn thiếu vào bảng
`projects` mà không xóa dữ liệu hiện có.

## Kiểm thử

```powershell
python -m unittest -v test_project_overview.py
node --check static/js/main.js
```

Bộ test dùng bản sao tạm của SQLite database, không thay đổi dữ liệu thật.

## Cấu hình an toàn

Tạo `.env` từ `.env.example` và thay toàn bộ mật khẩu/secret trước khi đưa lên
môi trường dùng chung. Không commit `.env` hoặc database thật vào kho mã nguồn.

- Mật khẩu được lưu trong bộ nhớ dưới dạng hash, so sánh bằng `check_password_hash`.
- Nên đặt mật khẩu **riêng** cho từng tài khoản (`ADMIN_PASSWORD`,
  `MANAGER_DONGNAI_PASSWORD`, ...). Nếu chỉ đặt `USER_PASSWORD` thì cả 4 tài khoản
  dùng chung một mật khẩu và app sẽ in cảnh báo khi khởi động.
- CORS mặc định **tắt** vì frontend gọi API cùng origin. Chỉ khai báo `CORS_ORIGINS`
  khi thực sự phục vụ một origin khác.
- Chạy sau HTTPS thì đặt `SESSION_COOKIE_SECURE=true`.
