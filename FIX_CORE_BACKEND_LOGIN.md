# TH79 iMove Admin – Core Backend Login Fix

## Nguyên nhân
Bản Admin cũ deploy trên Vercel nhưng `src/coreApi.js` vẫn gọi `/api/core-connection` và `/core-api/...`. Hai URL này chỉ tồn tại khi chạy Node Admin Gateway (`server/server.js`). Vercel đang phục vụ static SPA nên request bị rewrite về frontend/404, khiến màn đăng nhập kết luận sai là `Không tìm thấy Core Backend` dù Core VPS vẫn online.

## Bản sửa
- Login gọi trực tiếp `https://backendimove.daututh79.com/api/admin-auth/login`.
- Health gọi trực tiếp `https://backendimove.daututh79.com/health`.
- Toàn bộ Core/Admin API gọi trực tiếp Core HTTPS qua `coreUrl()`.
- Không phụ thuộc `/api/core-connection` hoặc `/core-api` khi chạy production.
- F12 Console hiển thị URL, status và response JSON cho health/login/API.

## Vercel Environment Variables
Thiết lập:
```
VITE_API_URL=https://backendimove.daututh79.com
VITE_CORE_BACKEND_URL=https://backendimove.daututh79.com
```
Sau đó Redeploy.

## Backend CORS
Domain Admin thực tế phải có trong `CORS_ORIGINS` của backend. Nếu Admin dùng custom domain `https://adminimove.daututh79.com`, thêm domain đó. Nếu đang dùng `*.vercel.app`, thêm chính xác domain Vercel production.

## Debug F12
Mở Console sẽ thấy các nhãn:
- `[TH79 iMove Admin] CORE HEALTH`
- `[TH79 iMove Admin] ADMIN LOGIN REQUEST`
- `[TH79 iMove Admin] ADMIN LOGIN RESPONSE`
- `[TH79 iMove Admin] CORE API FAILED`

Nếu trình duyệt báo CORS/Failed to fetch, frontend đã gọi đúng URL nhưng backend chưa cho phép Origin hiện tại.
