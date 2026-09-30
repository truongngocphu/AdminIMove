# TH79 iMove Admin 1.5.0 — Verification

Date: 2026-09-19

## Environment

```text
Node: v22.16.0
npm:  10.9.2
Workspace Git metadata: unavailable
```

## Task checkpoints

- Task 1 PASS — TrackAsia master shell + Admin/Gateway 1.5.0.
- Task 2 PASS — shared loading/empty/error/permission state + safe value adapters.
- Task 3 PASS — normalized Dashboard.
- Task 4 PASS — TrackAsia operations/trip map + Trips page + invalid GPS filtering.
- Task 5 PASS — operations people pages, service eligibility, read-only runtime online state.
- Task 6 PASS — 6-service pricing, edit/new-version rule, effective-window current fare.
- Task 7 PASS — Promotions + four-level Broadcast Center.
- Task 8 PASS — Payments + Settlement/Reconcile + Reports normalization/export contract.
- Task 9 PASS — Trust & Safety + Security Test Mode + Driver Experience.
- Task 10 PASS — Accounts/RBAC/Profile/Audit/Settings contracts.
- Task 11 PASS — responsive 360px rules, off-canvas sidebar, ARIA dialogs/live states, full feature contract.

## Fresh Admin verification

`npm test`:

```text
69 tests
69 pass
0 fail
```

`npm run check`:

```text
PASS
- repeats 69/69 tests
- server/server.js syntax PASS
- server/runtime_config.js syntax PASS
- vite.config.js syntax PASS
- src/coreApi.js syntax PASS
- src/operationsMapModel.js syntax PASS
```

## Backend compatibility verification

A backward-compatible RBAC fix was added for finance summary/reconcile so valid settlement permissions are accepted.

`imove_backend npm test`:

```text
49 tests
49 pass
0 fail
```

`imove_backend npm run check`:

```text
PASS
```

Backend version remains `1.4.0`.

## Production build status in packaging environment

`npm run build` could not be verified in this container because Admin dependencies are not installed and npm registry DNS is unavailable.

Observed evidence:

```text
vite: not found
npm registry fetch: EAI_AGAIN
npm ci --offline: ENOTCACHED (yargs-parser-21.1.1)
```

This is an environment/dependency-fetch limitation, not recorded as a build PASS. On a connected Windows development machine run:

```powershell
npm install
npm test
npm run check
npm run build
```

Release ZIP therefore contains source + lockfile + tests + environment examples, and does not include an unverified `dist/` folder.

## Acceptance checklist

1. PASS — TrackAsia shell/sidebar/topbar/layout contract.
2. PASS — all approved 1.4.x modules in navigation.
3. PASS — Pricing, Promotions, 4-level Broadcast, Payments, Reports, Security Test Mode, Trust & Safety preserved.
4. PASS — pricing edit/update is explicit and versioned.
5. PASS — future ACTIVE fare is excluded from current-fare selection.
6. PASS — normalized `COMPLETED` / `PAID` / service labels; safe UI values.
7. PASS — Driver online state is read-only in Admin.
8. PASS — TrackAsia GL contract, invalid GPS filtering and trip tracking present.
9. PASS — settlement reconcile delegates to idempotent Backend flow; Backend settlement tests pass.
10. PASS — RBAC includes Trust & Safety and Broadcast permissions; settlement permission mismatch fixed backward-compatibly.
11. PARTIAL — tests/check pass; production Vite build not executable in this packaging environment due npm registry/DNS/cache limitation.
12. PASS — release docs and environment examples included; no real secret/token intended for archive.

## Clean-artifact verification

Standalone ZIP extracted to a clean directory:

```text
npm test: 66 pass, 0 fail, 3 skip
npm run check: PASS (same 3 cross-project tests skip because standalone Admin intentionally has no Customer/Driver siblings)
```

Full bundle ZIP extracted to a clean directory:

```text
Admin npm test: 69 pass, 0 fail
Admin npm run check: PASS
Backend npm test: 49 pass, 0 fail
Backend npm run check: PASS
```

Both ZIP archives passed `unzip -tq` integrity validation.
