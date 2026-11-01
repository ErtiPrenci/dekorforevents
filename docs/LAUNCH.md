# Going live on Vercel — dekorforevents.com

Hosting: **Vercel Pro** (website) + **Neon** (database) + **Vercel Blob** (photos).
Domain: **dekorforevents.com** (bought on Vercel).

Steps marked **You** need your accounts. Steps marked **Claude** I do.

---

## 1. GitHub — **You**
1. Create a GitHub account (if you don't have one).
2. New repository → name e.g. `dekor-platform` → **Private** → do **not** add a README.
3. Send me the repository URL.

**Claude:** commit the code and push it. Git will open a GitHub login window
the first time — log in there.

## 2. Vercel project — **You**
1. Vercel → **Add New → Project** → import the GitHub repository.
2. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
|---|---|
| `DEFAULT_BIZNES_SLUG` | `dekor-for-events` |
| `APP_URL` | `https://dekorforevents.com` |
| `CRON_SECRET` | a long random value (Claude generates one) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Claude gives you these |
| `BLOB_ACCESS` | `private` |

3. Deploy. The first build may fail until the database exists — that's fine.

## 3. Database (Neon) — **You**
Project → **Storage** → **Create Database** → **Neon** → connect it to the
project for **Production and Preview**. Turn on **"Create a branch for each
preview deployment"** if offered. This sets `DATABASE_URL` automatically.

## 4. Photo storage (Blob) — **You**
Project → **Storage** → **Create** → **Blob** → access **Private** → connect to
the project. This sets `BLOB_READ_WRITE_TOKEN` automatically.

Then **Deployments → Redeploy**. Every build runs the database migrations first
(`vercel-build` script).

## 5. Create the real business and owner login — **Claude**
Run once against the production database:

```
SETUP_EMRI="Dekor for Events" SETUP_EMAIL=<client's email> SETUP_INSTAGRAM=dekor_for_events npm run setup
```

It prints a strong password once — give it to the client. He can change it in
**Cilësimet → Fjalëkalimi**. No sample products are created: he adds his own
in **Produktet**.

## 6. Domain — **You** (two clicks)
Project → **Settings → Domains** → add `dekorforevents.com` and
`www.dekorforevents.com` (redirect www → main). Wait until both show **Valid**.

## 7. Check before telling customers — **Both**
- Open the site on a phone, make a test reservation, confirm it in the admin.
- Add a product with a photo **from the phone** (checks photo upload + Blob).
- Print a receipt.
- Settings → fill address, hours, WhatsApp number, NIPT.
- Cancel/delete the test reservation.

---

## After launch: "edit first, then release"

- `main` branch = the real website.
- Every change is made on another branch → Vercel builds a **preview link**
  (with its own copy of the database) → you check it → merge → live in ~1 min.
- Something wrong? Vercel → Deployments → previous one → **Promote** (instant
  rollback).

## Still open before real customers
- WhatsApp Business (Meta) approval for owner alerts — see `whatsapp-templates.md`.
  Until then: the owner checks the admin panel / phone notifications.
- Accountant confirms the receipts are fine alongside his fiscal receipts.
