# TH79 iMove Admin 1.6.4 - Core Direct

Admin Web không còn cần Admin Gateway port 5060 và không cần Nginx `/admin-gateway`.

## Production API

```text
https://backendimove.daututh79.com
```

Core API và Admin Console API đều chạy trên Backend này.

## Vercel

Environment Variables:

```env
VITE_API_URL=https://backendimove.daututh79.com
VITE_CORE_BACKEND_URL=https://backendimove.daututh79.com
VITE_TRACKASIA_API_KEY=<TRACKASIA_KEY>
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Không cấu hình rewrite `/api` về Vercel. Browser gọi trực tiếp Backend VPS.

## Kiểm tra

```bash
curl https://backendimove.daututh79.com/health
curl https://backendimove.daututh79.com/api/health
```

`/api/health` phải trả `service: TH79_IMOVE_CORE_ADMIN` sau khi Backend Core-Admin mới được deploy.
