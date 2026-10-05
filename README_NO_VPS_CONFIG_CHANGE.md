# TH79 iMove Admin — Direct Backend / Không đổi cấu hình VPS

Bản này được viết trên nền Admin(3) + các chỉnh sửa UI hiện tại.

## Mục tiêu
- Không yêu cầu sửa Nginx.
- Không yêu cầu tạo proxy `/api` hoặc `/core-api` trên VPS.
- Không yêu cầu Admin Gateway port 5060 để đăng nhập và gọi API quản trị.
- Frontend gọi trực tiếp `https://backendimove.daututh79.com`.
- Nếu có `VITE_CORE_BACKEND_URL` hoặc `VITE_API_URL`, source sẽ dùng biến đó; nếu không có thì tự fallback về domain production trên.

## Các file thay đổi để bỏ phụ thuộc proxy VPS
- `src/apiRuntime.js`
- `src/coreApi.js`
- `src/adminApi.js`
- `src/App.jsx`
- `src/TrustSafetyPage.jsx`
- `src/SettingsPage.jsx`

## Backend yêu cầu
Backend phải có CORS cho `https://imove.daututh79.com` và đã mount Admin Console routes `/api/admin-access/*`, `/api/bootstrap`, `/api/data/*`, `/api/admin-support/*`.

## Deploy
Giữ nguyên cấu hình VPS hiện tại. Chỉ build lại Admin:

```bash
npm install
npm run build
```

Sau đó thay `dist` cũ bằng `dist` mới theo đúng quy trình bạn đang dùng hiện tại.

## Kiểm tra trên Chrome DevTools
Sau deploy, request đăng nhập phải đi tới:

`https://backendimove.daututh79.com/api/admin-auth/login`

Không còn request bắt buộc tới:

`https://imove.daututh79.com/api/core-connection`

hoặc `/core-api/*`.
