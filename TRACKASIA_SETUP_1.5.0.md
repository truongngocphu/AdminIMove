# TrackAsia Setup — Admin 1.5.0

## 1. Tạo file môi trường

```powershell
Copy-Item .env.example .env
```

## 2. Cấu hình

```env
VITE_DEV_PORT=5173
VITE_ADMIN_API_URL=http://127.0.0.1:5060
VITE_TRACKASIA_API_KEY=YOUR_TRACKASIA_PUBLIC_KEY
VITE_TRACKASIA_API_BASE_URL=https://maps.track-asia.com
VITE_TRACKASIA_DETAIL_LEVEL=enhanced
VITE_TRACKASIA_STYLE_URL=
```

`VITE_TRACKASIA_API_KEY` là public browser key do TrackAsia cấp. Không commit key thật vào repository/release ZIP.

Nếu TrackAsia cấp style URL riêng, đặt vào `VITE_TRACKASIA_STYLE_URL`; nếu để trống app dùng style URL do `trackAsiaConfig.js` tạo từ base URL + key.

## 3. Admin Gateway

```powershell
Copy-Item server\.env.example server\.env
```

Giữ:

```env
ADMIN_PORT=5060
CORE_HTTP_PORT=5050
CORE_BACKEND_URL=http://127.0.0.1:5050
BACKEND_ENV_FILE=../../imove_backend/.env
MONGODB_DB=th79_imove
```

Không dùng biến generic `PORT` cho Admin Gateway.

## 4. Chạy

```powershell
npm install
npm run dev
```

- Vite: `http://127.0.0.1:5173`
- Admin Gateway: `http://127.0.0.1:5060`
- Core: `http://127.0.0.1:5050`
