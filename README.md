# PLATFORMA (name TBD)

Reservation and catalog platform for handmade event-decor workshops in Albania.
First business: **Dekor_for_Events**. Product plan: [docs/PLAN.md](docs/PLAN.md).

This is **Faza 1**: one business, but every table already carries `biznes_id`
so Faza 2 (many businesses) is an extension, not a rewrite.

## What works

**Shop (customers, Albanian)**
- Date-first browsing: pick the event date, see what is free
- Product pages with photos, size, material, live availability calendar
- Personalization: colour swatches (with extra price / extra repaint days),
  "other colour", text and number fields, notes, inspiration photos
- One reservation = one event date + any number of items
- Cash-only flow: the date is held for 48 h; the customer pays the kapar in
  cash at the workshop, or the date frees itself
- Special requests go to the owner for approval first
- Status page per reservation (`/r/<token>`) and lookup by code + phone (`/ndiq`)

**Admin (owner, mobile-first)**
- Dashboard: approvals, unpaid holds with countdown, upcoming deliveries,
  items out of the workshop, setup checklist
- Reservations: approve (set final price), record kapar, extend deadline,
  refuse, delivered (+ guarantee), returned, no-show, cancel, payments
- "Njofto klientin": prefilled WhatsApp message sent from the owner's own phone
- Printable work sheet per item (colour swatch, text, notes, inspiration photos)
- Month calendar, product management with photos and options, colour palette,
  blocked dates, editable terms, monthly cash log + CSV export
- Notifications to the owner: WhatsApp Cloud API + web push (PWA)

**Correctness**
- Double-booking is prevented with a per-product Postgres advisory lock and a
  re-check inside the transaction (`npm run test:race` fires 8 simultaneous
  bookings — exactly one succeeds)
- Items are blocked over setup/teardown buffers plus repaint days
- Expired holds stop blocking dates immediately, even if cron is late

## Run locally

Requirements: Node 20+, Docker.

```bash
npm install
cp .env.example .env          # then fill CRON_SECRET, VAPID keys, SEED_ADMIN_PASSWORD
npm run db:up                 # Postgres 16 on localhost:5433
npm run db:migrate
npm run db:seed               # business, owner login, palette, 5 sample products
npm run dev                   # http://localhost:3000  —  admin at /admin
```

Generate VAPID keys with `npx web-push generate-vapid-keys`. The owner login is
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`.

Seed photos are read from `scripts/seed-images/` (git-ignored, the client's own
photos); without them products are created without images.

| Script | What it does |
|---|---|
| `npm run db:reset` | Drop everything, migrate, seed (dev only) |
| `npm run db:generate` | New migration after editing `src/db/schema.ts` |
| `npm test` | Unit tests for availability, kapar, phones, options |
| `npm run test:race` | Concurrency test against the dev database |
| `npm run typecheck` | TypeScript |

## Scheduled jobs

Both need `Authorization: Bearer $CRON_SECRET`.

| Endpoint | When | Does |
|---|---|---|
| `/api/cron/skadimi` | every 15 min | expires unpaid holds, warns owner 6 h before |
| `/api/cron/permbledhje` | 08:00 Tirana | daily summary to each owner |

On Vercel, `vercel.json` schedules them and Vercel sends the header itself. On
a VPS, use crontab:

```
*/15 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/skadimi
0 7 * * *    curl -s -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/permbledhje
```

## WhatsApp

See [docs/whatsapp-templates.md](docs/whatsapp-templates.md). Without
credentials, notifications are logged (status `ANASHKALUAR`) and web push
still works.

## Structure

```
src/db/schema.ts            all tables (Albanian names, biznes_id everywhere)
src/lib/availability.ts     the availability algorithm (docs/PLAN.md §6)
src/lib/reservations.ts     create reservation + every status transition
src/lib/options.ts          colour/text/number options, price (shared client+server)
src/lib/notify/             WhatsApp, web push, notification events
src/lib/tenant.ts           which business — the only place Faza 2 changes routing
src/app/(shop)/             customer shop
src/app/admin/              owner panel
scripts/                    migrate, seed, reset, race test, icons
```

## Not in Faza 1 (by plan)

- Multiple businesses: subdomain routing, Row Level Security, super-admin,
  invites, trial/subscription (Faza 2)
- Custom-order production board with stage photos, buy flows, packages,
  waitlist, contract PDF, reports, customer-facing WhatsApp messages (Faza 3)
- Cancellation-credit ledger: cancelling works, but kapar credit is tracked
  manually in internal notes for now
- Kapar % per product (one rule per business for now)
- Photos are stored on local disk (`STORAGE_DIR`); move to S3/R2 before
  running on serverless hosting
