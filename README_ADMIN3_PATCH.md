# TH79 iMove Admin - bản chỉnh trên nền Admin(3)

Bản này được chỉnh **trực tiếp từ `Admin(3).rar`** mà bạn cung cấp.

## Nguyên tắc giữ nguyên kết nối đang deploy được

Ba file sau được giữ nguyên byte-for-byte từ source `Admin(3)`:

- `server/server.js`
- `src/coreApi.js`
- `vite.config.js`

Vì vậy luồng deploy đang chạy của source gốc vẫn giữ nguyên:

Browser -> Admin Gateway -> `/core-api` -> Core Backend.

Không chuyển Admin sang gọi Core Backend trực tiếp và không thay cấu trúc Gateway.

## Chỉ thay đổi các file

- `src/App.jsx`
- `src/DashboardPage.jsx`
- `src/TripsPage.jsx`
- `src/styles.css`
- thêm `src/SupportCenterPage.jsx`

## Nội dung sửa

1. Thêm menu **Chat Support** theo quyền `support.view`.
2. Chat Support hỗ trợ nhận xử lý, trả lời, đóng/mở hội thoại theo các quyền `support.assign`, `support.reply`, `support.close`.
3. Dashboard hiển thị theo role/quyền thực tế của tài khoản.
4. Dashboard không còn màn hình chờ `Đang tải Dashboard TrackAsia...`; giao diện hiện ngay và dữ liệu cập nhật nền.
5. Trang Chuyến xe không còn chặn toàn trang bằng `Đang tải chuyến xe...`; tải 100 chuyến gần nhất và hiển thị trạng thái tải nhỏ.
6. Căn lại icon/button/sidebar để tránh lệch icon.

## Deploy VPS

Giữ nguyên `server/.env` đang hoạt động của bạn.

```bash
npm install
npm run build
pm2 restart <TEN_PROCESS_ADMIN> --update-env
```

Nếu Admin đang chạy bằng `npm start`/`node server/server.js` qua PM2, giữ nguyên cách deploy hiện tại của source `Admin(3)`.

## Kiểm tra Core sau deploy

```bash
curl http://127.0.0.1:5060/api/core-connection
curl http://127.0.0.1:5060/core-api/health
```

## Kiểm tra kỹ thuật đã thực hiện

- JSX/JS syntax parse: OK.
- `server/server.js`: syntax OK.
- `server/runtime_config.js`: syntax OK.
- `vite.config.js`: syntax OK.
- Test suite sau chỉnh có đúng cùng 6 test cũ đang fail như source `Admin(3)` gốc; không phát sinh test fail mới. Các fail cũ liên quan version/test contract và file `server/.env.example`, không phải thay đổi của patch này.
