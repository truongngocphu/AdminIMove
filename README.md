# TH79 iMove Admin 1.6.0 — TrackAsia Full Enterprise · UI Fix

Admin 1.5.1 dùng **TrackAsia v1.3.5 làm UI master** và giữ business/API của iMove 1.4.x. Backend Core vẫn là 1.4.0.

## Thành phần chính

- Dashboard dữ liệu thật, normalized `COMPLETED` / `PAID` / `serviceCode`.
- Bản đồ vận hành TrackAsia GL, lọc GPS lỗi `(0,0)` và tọa độ không hợp lệ.
- Chuyến xe + chi tiết + timeline + Trip Operations Map.
- Live Dispatch, Matching & Phát đơn, Driver Experience.
- Khách hàng, Tài xế, Hồ sơ/KYC.
- 6 dịch vụ: `BIKE`, `CAR_4`, `CAR_7`, `MPV_7`, `LUXURY_4`, `LUXURY_7`.
- Giá cước versioned: cập nhật giá đang chạy bằng version mới, không ghi đè lịch sử.
- Khuyến mãi/mã giảm giá.
- Thông báo Cấp 1 / Cấp 2 / Cấp 3 / Thông báo thường.
- Thanh toán, Settlement/Reconcile, Báo cáo/Export.
- Trust & Safety, Security Test Mode.
- Tài khoản nội bộ, Phân quyền, Profile, Audit Log, Cài đặt hệ thống.
- Responsive/off-canvas mobile và shared loading/error/permission states.

## Cổng development

```text
Core Backend   5050
Admin Gateway  5060
Admin Vite     5173
```

## Cài đặt Windows

```powershell
Copy-Item .env.example .env
Copy-Item server\.env.example server\.env
npm install
npm test
npm run check
npm run build
npm run dev
```

Mở `http://127.0.0.1:5173`.

Backend 1.4.0 phải chạy tại `http://127.0.0.1:5050`.

## TrackAsia

Sửa `.env`:

```env
VITE_TRACKASIA_API_KEY=YOUR_TRACKASIA_PUBLIC_KEY
VITE_TRACKASIA_API_BASE_URL=https://maps.track-asia.com
VITE_TRACKASIA_DETAIL_LEVEL=enhanced
VITE_TRACKASIA_STYLE_URL=
```

Không hard-code token vào source. Xem `TRACKASIA_SETUP_1.5.0.md`.

## Tài liệu release

- `RELEASE_NOTES_1.5.0.md`
- `VERIFICATION_1.5.0.md`
- `TRACKASIA_SETUP_1.5.0.md`
- `SETUP_WINDOWS.md`

## Hotfix 1.5.1

Bản 1.5.1 giữ nguyên toàn bộ module/API 1.5.0 và chỉ điều chỉnh tỷ lệ giao diện Login/Dashboard, đồng bộ runtime label, và regression tests. Xem tài liệu `ADMIN_1.5.1_UI_FIX.md` ở thư mục gốc của full bundle.
