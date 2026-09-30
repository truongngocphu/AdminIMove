# Thiết lập Giá cước v2.6

1. Trong `server/.env`, đặt `MONGODB_DB` đúng database đang dùng (ví dụ `th79_imove`).
2. Chạy `npm run dev`.
3. Vào **Giá cước**.
4. Nếu MongoDB chưa có `fare_configs`, bấm **Tạo bảng giá**. Các ô giá đều trống, không có số mẫu.
5. Nhập dữ liệu và lưu. Web ghi trực tiếp vào MongoDB.
6. Chọn bảng giá vừa tạo để thêm/sửa/xóa mốc km.
7. Phí nền tảng và phụ phí cũng có Tạo/Sửa/Xóa.
8. Đặt bảng giá `ACTIVE` để API `/api/fares/estimate` sử dụng.

Collections:
- `fare_configs`
- `platform_fees`
- `surcharges`
- `services`
- `service_areas`
