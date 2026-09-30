# TH79 iMove Admin 1.5.0 — Setup Windows

## Yêu cầu

- Node.js 20+ (Node 22/24 dùng được).
- Backend iMove 1.4.0 đã cấu hình MongoDB Atlas.

## Bước 1 — Environment

```powershell
Copy-Item .env.example .env
Copy-Item server\.env.example server\.env
```

Mở `.env` và thay:

```env
VITE_TRACKASIA_API_KEY=YOUR_TRACKASIA_PUBLIC_KEY
```

## Bước 2 — Cài dependency và kiểm tra

```powershell
npm install
npm test
npm run check
npm run build
```

## Bước 3 — Chạy

Terminal Backend:

```powershell
cd ..\imove_backend
npm install
npm run dev
```

Terminal Admin:

```powershell
cd ..\imove_admin
npm run dev
```

Mở `http://127.0.0.1:5173`.

## Cổng

```text
Core Backend   5050
Admin Gateway  5060
Admin Vite     5173
```

## Nếu 5173 đang bị chiếm

```powershell
$pid5173=(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue).OwningProcess
if($pid5173){Stop-Process -Id $pid5173 -Force}
```
