# TH79 iMove Privacy Policy deployment

Trang public đã được thêm tại:

- Source tĩnh: `public/privacy/index.html`
- React fallback: `src/PrivacyPolicyPage.jsx`
- Route public: `/privacy` trong `src/App.jsx`
- URL production dự kiến: `https://imove.daututh79.com/privacy`

## Build

```powershell
npm install
npm run build
```

Sau build, kiểm tra file:

```text
dist/privacy/index.html
```

## Deploy

Deploy thư mục `dist` lên host đang phục vụ `imove.daututh79.com` hoặc chạy Admin production bằng:

```powershell
npm run build
npm start
```

`server/server.js` đã có static hosting cho `dist` và SPA fallback. `express.static` sẽ phục vụ `dist/privacy/index.html` tại `/privacy/`; route React `/privacy` cũng là fallback nếu host chuyển request vào `index.html`.

## Kiểm tra trước khi khai Google Play

Mở trình duyệt ẩn danh và kiểm tra:

```text
https://imove.daututh79.com/privacy
```

Yêu cầu:

- Không cần đăng nhập.
- Không tải PDF/file; phải hiển thị trang web HTML.
- HTTPS hợp lệ.
- Mở được trên điện thoại và máy tính.
- Hiển thị đầy đủ phạm vi TH79 iMove, Driver và Merchant.

Sau đó dùng URL trên trong Google Play Console > Nội dung ứng dụng > Chính sách quyền riêng tư.
