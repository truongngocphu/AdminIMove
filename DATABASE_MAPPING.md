# MongoDB mapping — TH79 iMove Admin v2.4.0

Frontend không kết nối trực tiếp MongoDB. Backend Node.js trong `server/server.js` đọc chuỗi kết nối từ `server/.env`.

## Collection mặc định

| Admin | MongoDB collection | Trường giao diện đang dùng |
|---|---|---|
| Khách hàng | `customers` | id, name, phone, email, trips, spend, status, joined |
| Tài xế | `drivers` | id, name, phone, service, rating, trips, online, approval, income, license, area |
| Chuyến xe | `trips` | id, customer, driver, service, pickup, destination, price, status, payment, time |
| Thanh toán | `payments` | id, tripId, customer, amount, method, status, createdAt |
| Biểu đồ doanh thu | `revenue` | day, value |
| Cài đặt Admin | `settings` | document có `_scope: th79_imove_admin` |

Nếu database chính dùng tên collection khác, chỉnh `COLLECTION_*` trong `server/.env`.

> Nếu schema app chính dùng tên field khác (ví dụ `fullName` thay vì `name`), cần map field tại backend hoặc frontend. Không nên đổi schema MongoDB chỉ để phục vụ giao diện Admin.
