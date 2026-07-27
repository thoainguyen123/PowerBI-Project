# Sử dụng Python 3.12-slim làm image cơ sở
FROM python:3.12-slim

# Thiết lập các biến môi trường để Python chạy tối ưu trong Docker
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Sao chép requirements.txt và cài đặt thư viện
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Expose cổng 5000 mà Flask đang chạy
EXPOSE 5000

# Chạy bằng WSGI server ổn định hơn Flask development server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "app:app"]
