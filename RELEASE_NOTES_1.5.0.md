# TH79 iMove Admin 1.5.0 — Release Notes

## TrackAsia Full Enterprise

1.5.0 dùng TrackAsia v1.3.5 làm UI master: sidebar, topbar, page spacing, cards, tables, dialogs, map interaction và responsive behavior thống nhất trong toàn Admin.

## Chức năng

- Dashboard normalized analytics và real-data KPI.
- Operations Map TrackAsia GL, invalid GPS filtering, Trip Operations Map.
- Trips page + timeline + payment/settlement state.
- Live Dispatch + Matching.
- Customers + Drivers + KYC + Driver Experience.
- 6 service codes: BIKE, CAR_4, CAR_7, MPV_7, LUXURY_4, LUXURY_7.
- Pricing versioned, chỉnh DRAFT/future version trực tiếp; giá ACTIVE hiện hành tạo version mới.
- Current fare tôn trọng `effectiveFrom/effectiveTo`.
- Promotion CRUD.
- 4 cấp thông báo: Critical / High / Important / Normal.
- Payments normalized `PAID`.
- Settlement summary + idempotent reconcile.
- Reports/export dùng cùng normalized source.
- Trust & Safety + Security Test Mode.
- Accounts, Roles/Permissions, Profile, Audit Log, Settings.
- Permission states, offline/error states, safe value rendering.
- Mobile off-canvas, table scroll, modal viewport safety, reduced motion.

## RBAC fix

- Admin Gateway bổ sung `broadcast.view` và `broadcast.send`.
- Core finance summary/reconcile chấp nhận cả permission family `settlement.*`, `settlements.*` và legacy `settings.*`, nên Finance role không bị 403 khi có quyền đối soát hợp lệ.

## Version contract

```text
Admin Web/Gateway  1.5.0
Core Backend       1.4.0
Customer           1.4.0+140
Driver             1.4.0+140
```
