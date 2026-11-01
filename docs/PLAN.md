# PLATFORMA (name TBD) — Product Plan

Reservation & catalog platform for handmade event-decor workshops in Albania.

- **The platform is your product**, with its own name, domain and brand
  (still to be chosen — see §12). `PLATFORMA` / `platforma.al` are placeholders.
- **Dekor_for_Events is the first client**, not the platform. Its name only
  appears inside its own shop and as the example business in this plan.

Built **multi-tenant**: every decor business runs its own shop on the same
software, and **manages it entirely itself** — products, photos, prices,
reservations. You build and run the software; you never touch a client's
business content.

- UI language: **Albanian (sq)**
- Market: **Albania only**
- Payments: **cash only** (in person, at the workshop or on delivery)
- Catalog: everything is **handmade by the business** and stays theirs unless sold.
  Mostly **rented**, some **bought**.

---

## 1. The real problem

The client thinks he needs a marketplace. What he actually needs first is a
**public availability calendar with a cash-backed lock on dates**.

Every painful phone call is one of exactly two questions:

| Question | Solved by |
|---|---|
| "A është e lirë arkada më 12 qershor?" | Public per-item availability calendar |
| "A është gati porosia ime?" | Order tracker with status + photos |

The second real problem is **phantom reservations**: a date is blocked, the
customer never shows, nobody else could book it. The answer is policy enforced
by the software:

> **Pa kapar, data nuk bllokohet përgjithmonë.**
> A reservation holds the date for 48 hours. The customer comes to the workshop
> and pays the kapar in cash. If not, the date frees itself automatically.

---

## 2. Strategic decision: white-label SaaS, not a shared marketplace

| Model | What it means | Verdict |
|---|---|---|
| **A. Shared consumer marketplace** | One site, all businesses' decor side by side | ❌ Not first |
| **B. White-label SaaS** | Each business gets its own branded shop + admin, on one codebase | ✅ Build this |

A shared marketplace puts the first client directly next to his competitors
and hands them his Instagram traffic. He wants *his* customers to stop calling
*him*. Each business gets its own shop.

A shared **opt-in directory** (`/zbulo` — browse all participating businesses
by city and date) can come later, once there are ≥5 businesses.

---

## 3. Multi-tenancy architecture

### One codebase, one deployment, many businesses

Every business runs on the **same code and the same server**. What differs
between businesses is **data and settings only** — never code. There is no
"implementation per business"; there is **onboarding** (see §12).

```
Biznes (tenant)
  id, emri, slug, logo_url, ngjyra_primare, ngjyra_sekondare
  nenfusha          -- dekorforevents.<platforma>.al   (always, free)
  fusha_vet         -- dekorforevents.al               (optional, business pays the domain)
  qyteti, adresa_punishtes, google_maps_url, orari_punes
  telefoni, whatsapp_pronarit, instagram, email
  monedha           -- LEK (default) | EUR — many Albanian event businesses quote in EUR
  plani, statusi_abonimit, paguar_deri
  cilesimet (JSON)  -- deposit rules, hold hours, buffers, delivery zones, T&C text
```

### Isolation rules (non-negotiable)

1. **Every tenant-owned table carries `biznes_id`**, including join tables.
2. **Enforce at the database** with Postgres Row Level Security on every table.
   One forgotten `WHERE biznes_id = ?` would leak one competitor's customers to
   another — RLS makes that impossible rather than unlikely.
3. **Resolve the tenant from the hostname** in middleware, once per request.
4. **Storage paths are namespaced**: `biznes/{id}/produkte/{uuid}.webp`.
5. **Reservation codes are per-tenant**: `DFE-2026-0142`, prefix configurable.

### Three levels of user

| Level | Albanian | Can do |
|---|---|---|
| Super-admin (you) | Administrator i platformës | Create business accounts, subscriptions, pause/reactivate. **No access to a business's content by default.** |
| Business owner / staff | Pronar / Staf | Everything inside their own business |
| Customer | Klient | Browse, reserve, track — inside one shop. No account needed. |

Staff roles: `PRONAR` (everything) and `STAF` (reservations + production, no
prices or settings). Keep it to two.

---

## 4. Product modes

All items are **handmade by the business and owned by it**. They are sold in
three ways:

| Mode | Albanian | Behaviour |
|---|---|---|
| `RENTAL` | Me qira | **The main mode.** Reusable structure, occupies a **date window**, comes back. |
| `CUSTOM` | Bli të re (me porosi) | Customer buys **a new copy made for them**. Production queue, ready-by date. |
| `SALE` | Bli këtë copë | Customer buys **the actual piece**. It leaves the rental pool for good. |

`CUSTOM` is what "bought → ready in 2 weeks" means. `SALE` is the rarer case of
selling an existing piece; when it completes, the product (or one unit of its
stock) is marked `SHITUR` and stops appearing as rentable. Any future rental
reservations on that unit must be resolved first — the admin is blocked from
completing the sale until they are.

A product can allow several modes; each has its own price field.

---

## 4b. Personalization: colour, text, notes

Customers can tailor each item: choose its **colour**, add **text** (a name,
an age — like "ETUAL" and "5" on the K-Pop setup), and write a **note** with
inspiration photos. The owner decides, per product, what is allowed.

### Option types (owner defines them per product)

| Type | Albanian | Example | Customer sees |
|---|---|---|---|
| `NGJYRE` | Ngjyra | Rozë pastel, Lejla, E bardhë, Ari | Colour swatches (circles) |
| `TEKST` | Tekst | "Emri mbi arkadë" (max 12 shkronja) | Text field |
| `NUMER` | Numër | "Mosha" | Number field |
| `ZGJEDHJE` | Zgjedhje | Madhësia: e vogël / e madhe | Buttons |

Every option value can carry:
- **`cmimi_shtese`** — extra price, e.g. "Ari metalik +2.000 L"
- **`dite_shtese`** — extra days, e.g. repainting takes +2 days before the event
- **`foto_url`** — a photo of the item in that colour (the main photo switches)

### Colour palette — defined once per business
The owner keeps one **Paleta e ngjyrave** in settings (name + colour code +
optional extra price). On each product he just ticks which palette colours are
possible. No retyping 15 colours on every product.

Plus one special swatch: **"Ngjyrë tjetër"** — the customer describes any
colour (or picks it on a colour wheel). Because nobody can price that
automatically, it triggers **owner approval** (below).

### Notes and inspiration
- **Per item:** "Shënim për këtë produkt" (up to 500 characters) + up to
  3 inspiration photos
- **Per reservation:** a general note for the whole event (theme, colours of
  the party, venue details)

### Rentals vs bought items
- **Bought new (CUSTOM):** colour and text are natural — it is being made anyway.
- **Rental:** the owner chooses per product:
  - *Ngjyrë fikse* — rents as it is (most common)
  - *Ngjyra me zgjedhje* — he repaints for the customer; the option's
    `dite_shtese` widens the blocked window before the event, so the calendar
    accounts for the repaint time automatically
  - Text/letters on rentals (names, numbers) are usually separate add-on
    pieces, modelled as `TEKST` options with an extra price

### When the owner must approve first
A reservation goes to **`NE_PRITJE_TE_APROVIMIT`** (instead of straight to
waiting for the kapar) if any item has:
- "Ngjyrë tjetër" (free-text colour)
- a note or inspiration photo on an item the owner marked *"shënimet kërkojnë aprovim"*

The date is held during approval. The owner reviews, sets the final price and
taps **"Aprovo"** — only then does the 48 h kapar clock start. Or he taps
**"Refuzo"** with a reason. The customer sees the outcome at `/ndiq`, and the
owner can tap **"Njofto klientin"**, which opens WhatsApp **on his own phone**
with a prefilled Albanian message — free, no API needed.

### Snapshot, never reference
Each reservation line stores a **copy** of what was chosen (option name, value,
colour code, extra price, note). If the owner later renames or reprices a
colour, past reservations stay exactly as the customer ordered them.

### Work sheet for the workshop
Every reservation detail page has **"Fletë pune"**: one printable/shareable
page per item with the photo, big colour swatch + name + code, text to
write, notes and inspiration photos. This is what goes on the workshop wall.

---

## 5. Data model

Every table below except `Biznes`, `Kategori` and `Tema` carries `biznes_id`.

```
Kategori        id, emri, slug, renditja                  (shared, seeded)
Tema            id, emri                                  (shared, seeded)
                -- Princeshë, K-Pop, Boho, Baby Shower, Dasmë, Pagëzim, Ditëlindje

Produkt         id, biznes_id, emri, slug, pershkrimi, kategori_id, temat[]
                modet[]              -- RENTAL | CUSTOM | SALE
                gjeresi_cm, lartesi_cm, thellesi_cm, pesha_kg
                materiali, ngjyrat[]
                cmimi_qira, cmimi_porosi, cmimi_shitje
                kapari_perqindje, kapari_minimum
                garancia_demtimit
                sasia_ne_stok        -- copies he owns (usually 1)
                dite_montimi         -- buffer BEFORE event (transport/setup)
                dite_crmontimi       -- buffer AFTER event (teardown/cleaning)
                dite_prodhimi        -- for CUSTOM
                statusi              -- AKTIV | NE_MIREMBAJTJE | SHITUR | I_TERHEQUR

Foto            id, biznes_id, produkt_id, url, renditja, eshte_kryesore
Pako            id, biznes_id, emri, produktet[], cmimi_paketes

Klient          id, biznes_id, emri, telefoni, qyteti, adresa
                numri_mosparaqitjeve, i_bllokuar
                -- unique (biznes_id, telefoni)

Rezervim        id, biznes_id, kodi, klient_id
                lloji               -- QIRA | POROSI | BLERJE
                data_eventit, lloji_eventit
                dritarja_nga, dritarja_deri      -- computed with buffers
                menyra_dorezimit                 -- MARRJE | DERGESE
                adresa_dorezimit, tarifa_transportit
                statusi                          -- see §7
                mbahet_deri                      -- hold expiry timestamp
                totali, kapari, mbetja
                shenime_klienti, shenime_brendshme

RezervimRresht  id, biznes_id, rezervim_id, produkt_id|pako_id, sasia, cmimi_njesi
                zgjedhjet (JSON snapshot)   -- [{opsioni, vlera, hex, cmimi_shtese, dite_shtese}]
                shenimi, fotot_frymezuese[]
                kerkon_aprovim, cmimi_perfundimtar

PaletaNgjyrave  id, biznes_id, emri, hex, cmimi_shtese, renditja
OpsionProdukti  id, biznes_id, produkt_id, lloji (NGJYRE|TEKST|NUMER|ZGJEDHJE)
                emri, i_detyrueshem, gjatesia_max, vlen_per_modet[]
                lejon_ngjyre_tjeter, shenimet_kerkojne_aprovim
VleraOpsioni    id, biznes_id, opsion_id, paleta_id?, emri, foto_url
                cmimi_shtese, dite_shtese, renditja

Pagese          id, biznes_id, rezervim_id, shuma
                lloji        -- KAPAR | MBETJE | GARANCI | KTHIM_GARANCIE
                menyra       -- KESH   (enum kept open for later)
                regjistruar_nga, regjistruar_me, shenim

Porosi          id, biznes_id, rezervim_id, pershkrimi, fotot_frymezuese[]
                cmimi_dakorduar, data_gati, faza_prodhimit
FotoFaze        id, biznes_id, porosi_id, faza, url

BllokimDate     id, biznes_id, produkt_id?, nga, deri, arsyeja
                -- produkt_id null = whole business closed
ListePritje     id, biznes_id, produkt_id, data, klient_id, njoftuar
Njoftim         id, biznes_id, kanali, marresi, shablloni, statusi, gabimi
                -- log of every WhatsApp/push sent, for debugging and cost tracking
```

---

## 6. The availability algorithm

```
disponueshmeria(produkt, data_eventit, sasia):

  dritarja = [ data_eventit - produkt.dite_montimi - max(zgjedhjet.dite_shtese) ,
               data_eventit + produkt.dite_crmontimi ]
               -- e.g. repaint +2 days blocks the arch 2 days earlier

  te_zena = SUM(rresht.sasia)
            FROM rezervim_rresht JOIN rezervim
            WHERE rresht.produkt_id = produkt.id
              AND rezervim.lloji = QIRA
              AND rezervim.statusi IN (NE_PRITJE_TE_APROVIMIT,
                                       NE_PRITJE_TE_KAPARIT, KONFIRMUAR, DOREZUAR)
              AND rezervim.dritarja OVERLAPS dritarja

  nëse produkti nuk është AKTIV                         -> JO
  nëse ekziston BllokimDate që mbivendoset me dritarjen -> JO
  kthe (te_zena + sasia) <= produkt.sasia_ne_stok
```

### Two rules that are easy to get wrong

**1. Buffer days are mandatory.** An arch used on Saturday is not available
Friday (transport + setup) or Sunday morning (teardown). Each product has its
own buffers — a small table 0/0, a large arch 1/1.

**2. Check and write must be atomic.** Two people booking the last free arch
for the same date, 200 ms apart, must not both succeed.
- `sasia_ne_stok = 1` → `daterange` column + `EXCLUDE USING gist` constraint
  on `(biznes_id, produkt_id, dritarja)`. Double-booking becomes impossible.
- `sasia_ne_stok > 1` → `pg_advisory_xact_lock(produkt_id)` inside the booking
  transaction, then re-count before insert.

---

## 7. Reservation flow (cash only)

```
 Customer picks item + date, enters name + phone, submits
    │
    ▼
 NE_PRITJE_TE_KAPARIT   date IS blocked, held for 48h (setting)
    │  → owner gets WhatsApp alert immediately (§9)
    │  → customer sees: code, kapar amount, deadline, workshop address + map
    │
    ├── customer comes, pays kapar in cash ──► owner taps "Kapari u pagua"
    │                                              │
    │                                              ▼
    │                                          KONFIRMUAR
    │
    ├── owner taps "Zgjat afatin" (+24h)  — e.g. customer from Shkodër
    ├── owner taps "Refuzo"               ──► REFUZUAR  (date freed)
    └── 48h pass, nothing paid            ──► SKADUAR   (date freed, waitlist notified)

 KONFIRMUAR ── delivery/pickup day ──► DOREZUAR ── returned & checked ──► PERFUNDUAR
      │                                    │
      └──► ANULUAR (ladder, §8)            └──► MOSPARAQITJE (no-show: kapar kept)
```

**With special requests** (free-text colour, or notes on a product that needs
approval — see §4b), one step comes first:

```
 submit ──► NE_PRITJE_TE_APROVIMIT   date held, owner alerted with ⚠️
               ├── owner sets final price, taps "Aprovo" ──► NE_PRITJE_TE_KAPARIT (48h starts now)
               └── owner taps "Refuzo" + reason          ──► REFUZUAR (date freed)
```
If the owner has not answered within 48 h, he gets a reminder — the hold does
**not** expire while waiting on *him*, only while waiting on the customer.

**What the customer sees after submitting** (the most important screen):

> ✅ **Rezervimi DFE-2026-0142 u regjistrua.**
> Data mbahet për ju deri më **14 qershor, ora 18:00**.
> Për ta konfirmuar, ejani në punishte dhe paguani kaparin prej **6.000 L** në kesh.
> 📍 Rruga …, Tiranë — [Hap në Google Maps] · 🕘 E Hënë–E Shtunë 09:00–19:00
> 💬 [Shkruani në WhatsApp]

### One reservation, as many items as the customer wants
A reservation is a **cart for one event**: arch + 6 flower tables + backdrop +
2 pedestals is **one** reservation with one code, one kapar and one deadline.
There is **no limit on items**. The kapar is calculated on the whole cart.

A customer with two events (birthday in May, christening in June) simply makes
two reservations — also allowed.

### Abuse protection — warn the owner, never block the customer
Holds are free, so someone *could* block dates and never come. The software
does **not** hard-limit anyone — a real customer with a big order must never be
refused by a rule. Instead it gives the owner the information to decide:

- Phone number required, Albanian format validated (`06X XXX XXXX`)
- Rate limit per IP + honeypot field (stops bots, not people)
- In the admin, a reservation is **flagged** (⚠️, not blocked) when:
  - the same phone already has other unpaid reservations
  - the phone has a previous `SKADUAR` or `MOSPARAQITJE`
- The owner sees every reservation instantly and decides: wait, call, or refuse
- If real abuse ever happens: optional phone verification code, as a setting

### Scheduled jobs
- every 15 min — expire holds past `mbahet_deri`, free the date, notify waitlist
- 6 h before a hold expires — reminder to owner ("Ana nuk ka ardhur ende")
- daily 08:00 — owner summary: today's deliveries, returns, expiring holds

---

## 8. Money rules (the no-show fix)

All values are per-business settings; these are defaults.

### Kapari (deposit) — paid in cash, non-refundable
- **30% of the rental price, minimum 3.000 L**
- Must be paid at the workshop within **48 h** (owner can extend)

### Shkalla e anulimit (cancellation ladder)
| Cancelled | Outcome |
|---|---|
| > 30 ditë para | Kapari bëhet **kredi**, e vlefshme 6 muaj për një datë tjetër |
| 15–30 ditë | 50% kredi |
| < 14 ditë | Kapari humbet |

Credit instead of refund costs nothing and keeps the customer.

### Mbetja (balance)
Paid in cash at pickup or delivery. Owner taps "Mbetja u pagua".

### Garancia e dëmtimit (damage deposit)
Cash, refundable, taken at pickup, returned after inspection. Recorded as its
own `Pagese` rows (`GARANCI` in, `KTHIM_GARANCIE` out) so it never counts as revenue.

### Repeat offenders
`numri_mosparaqitjeve >= 2` → future bookings from that phone number are
flagged **"kërko pagesë të plotë"** — the owner is warned before confirming
and decides himself.

### Fiscalization
He already handles fiscal receipts for his cash sales today. The software
**records** payments and exports them (CSV/PDF) — it does **not** issue fiscal
receipts. That stays with his existing fiscal device/software. Confirm with his
accountant; it is a legal question.

---

## 9. WhatsApp alerts to the owner

**Goal:** the moment a customer reserves, the owner's phone buzzes with:

> 🔔 **Rezervim i ri — DFE-2026-0142**
> Arkada me valë · e shtunë 12 qershor 2026
> 🎨 Rozë pastel · Teksti: "ETUAL" · Mosha: 5
> ⚠️ Ka kërkesa të veçanta — kërkon aprovim
> Klienti: Ana Hoxha · 069 123 4567
> Kapari: 6.000 L — afati 14 qershor 18:00
> 👉 dekorforevents.platforma.al/admin/r/0142

### WhatsApp or SMS?

| | WhatsApp | SMS |
|---|---|---|
| Does the owner actually read it? | ✅ Lives in WhatsApp all day | ⚠️ SMS inbox is mostly spam/bank codes in Albania |
| Clickable link to the reservation | ✅ | ✅ (but looks like spam) |
| Formatting, emoji, longer text | ✅ | ❌ 160 chars per part, multi-part costs more |
| Cost per message | Small per-message fee (Meta rate card) | Usually higher to Albanian numbers via international gateways |
| Setup | Meta Business verification + template approval (days) | Gateway account + sender-name registration |
| Works without internet | ❌ | ✅ |

**Decision: WhatsApp for the owner alerts, plus free web push as backup.**
SMS only makes sense as a last-resort fallback if WhatsApp delivery fails, and
it is not worth building in Faza 1.

### How
- **WhatsApp Business Cloud API (Meta)** with **one platform-owned number**
  (named after the platform, see §12) that sends to every business owner.
  Businesses need no Meta account and no setup — you configure it once for
  everyone.
- Messages are **approved templates** (category *utility*), in Albanian, with
  variables for code, product, date, customer, kapar, deadline, link.
- Meta charges a **small per-message fee** for business-initiated template
  messages. Check Meta's current rate card for Albania — at the volumes of a
  decor business it is cents per month per business, but put it in the price.
- Setup takes days, not hours: Meta Business verification, a dedicated phone
  number, template approval. **Start this in week 1** so it is ready when the
  code is.

### Templates to register
| Template | When | To |
|---|---|---|
| `rezervim_i_ri` | New reservation | Owner |
| `afati_po_skadon` | 6 h before hold expires | Owner |
| `permbledhje_ditore` | 08:00 daily | Owner |
| `porosi_e_re` | New custom order | Owner |

Customer-facing WhatsApp messages are **phase 2** — they add cost and need
opt-in. For now the customer gets the confirmation screen + a link to chat with
the business on WhatsApp.

### Backup channel (free, always on)
The admin panel is an installable **PWA** with **web push notifications**. If
WhatsApp fails or Meta is slow to approve, push still works. Every send is
logged in `Njoftim` with its status.

---

## 10. Custom orders — a real ready-by date

- each custom product has `dite_prodhimi`
- each business has a `kapaciteti_javor` (e.g. 3 orders/week)
- the system finds the first free production slot and shows a **concrete date**:

> *"Nëse porosit sot, gati deri më **14 nëntor 2026**."*

Production board in admin:
```
Pranuar → Kapari i paguar → Prerje → Montim → Lyerje → Gati → Dorëzuar
```
The customer follows it at `/ndiq/DFE-2026-0142`. A photo uploaded at each
stage stops the "a është gati?" calls and doubles as Instagram content.

---

## 11. Screens

### Customer shop (per business, branded)
| Route | Albanian | Notes |
|---|---|---|
| `/` | Ballina | Hero + **"Zgjidh datën e eventit"** first |
| `/katalogu` | Katalogu | Filters: kategori, temë, ngjyrë, çmim, **i lirë më datën X** |
| `/produkti/[slug]` | Produkti | Galeri, përmasat, materiali, **kalendar**, **ngjyrat, teksti, shënimi, foto frymëzimi**, "Rezervo" / "Bli" |
| `/pakot` | Pakot | Bundles — K-Pop, Princeshë, Baby Shower |
| `/rezervo` | Rezervo | Data, emri, telefoni, marrje/dërgesë, adresa |
| `/ndiq` | Ndiq rezervimin | By code + phone. No account. |
| `/kushtet` | Kushtet | T&C (kapar, anulim, dëmtime) — linked from the form |

### Business admin (mobile-first PWA)
- **Paneli** — sot / këtë javë, kapare në pritje (with countdown), dorëzime e kthime sot
- **Kalendari** — month/week, colour by status
- **Rezervimet** — list, filters, detail with chosen colours/text/notes; big buttons: *Aprovo*, *Kapari u pagua*, *Zgjat afatin*, *Refuzo*, *Dorëzuar*, *Kthyer*, *Njofto klientin*, *Fletë pune*
- **Produktet** — add from phone camera, photos, dimensions, prices, stock, buffers, **options** (colours from palette, text, number, choices) + photo per colour
- **Porositë** — production board
- **Klientët** — history, no-show flags
- **Arka** — cash recorded today/this month (kapar, mbetje, garanci)
- **Cilësimet** — logo, colours, **paleta e ngjyrave**, workshop address/hours, kapar rules, hold hours,
  delivery zones, blocked dates, T&C, staff, WhatsApp number for alerts

### First-run setup wizard (business admin)
The owner sets up his own shop, from his phone, without you:

1. Logo, colours, shop name
2. Workshop address, Google Maps link, opening hours, WhatsApp number for alerts
3. Kapar rules and hold time (defaults pre-filled)
4. Add the first product — camera → photos → name, size, price → publish
5. Copy the shop link → put it in the Instagram bio

A checklist stays on the dashboard until all five are done. Adding products
must be **fast on a phone**: take photos directly with the camera, automatic
compression, drag to reorder, "duplicate product" for similar items.

### Platform super-admin (you)
Businesses list, create account + send invite link, pause/reactivate,
subscription paid-until, WhatsApp message volume, storage use.
**No browsing of a business's products, customers or reservations.**
For support, the owner can grant temporary access from his own settings
("Lejo ndihmën teknike për 24 orë"); every access is logged and visible to him.

---

## 12. Business model: domains, onboarding, pricing

### Does each business need a different domain and implementation?

**Implementation: no.** Same code, same server, same database. A new business
is a new row in `Biznes` + its products + its settings. If you ever write code
*for one business only*, you have become an agency, and at 20–40 €/month an
agency loses money. Every feature you build goes to all businesses (behind a
setting or a plan if needed).

**Domain: optional.**
- **Default (free, instant):** `emri.<platforma>.al` — a subdomain of your
  platform domain. One wildcard DNS record covers every business.
- **Own domain (optional):** `dekorforevents.al`. The **business buys and owns
  the domain**; you point it at the platform once (Pro plan, small one-off fee).

### Self-service: you run the software, they run their business

You never upload products, set prices or handle reservations for anyone.
Onboarding a new business takes you **five minutes**:

1. Super-admin → "Biznes i ri" → name, owner's email/phone, plan
2. The owner gets an invite link, sets a password
3. The first-run wizard (§11) walks him through the rest, on his phone

What you *do* own: the software, uptime, backups, security, updates, bug
fixes, and answering "how do I…?" questions. That is what the monthly fee pays
for. Good in-app help texts and a short video per screen keep support time low.

### Pricing for the Albanian market

Because businesses set themselves up, a big setup fee is no longer justified
— there is no content work to charge for. And a free trial now costs you
nothing, which makes it easy to sell.

| | Price (suggestion) | Includes |
|---|---|---|
| **Provë falas** | **14–30 ditë** | Everything in Pro, no payment, no commitment |
| **Bazë** | **20–25 €/muaj** | Shop on subdomain, calendar, reservations, admin, WhatsApp alerts, 1 user |
| **Pro** | **35 €/muaj** | + own domain, custom-order tracker, staff users, packages, reports |
| **Vjetore** | **10 × monthly** | 2 months free — paid upfront in cash |
| **Lidhja e domenit** | **one-time ~30–50 €** (optional) | Only when they want their own domain on Pro |

Why this shape:
- **Free trial → monthly** matches the 20–40 € expectation and lets the
  product sell itself; their friend's shop is the demo.
- **Annual upfront** is the best deal in a cash economy: you collect once
  instead of chasing 12 small payments, they save 2 months.
- **Grace period:** unpaid for 15 days → shop shows "përkohësisht jashtë
  shërbimi", admin still works and data is kept. Their data is always
  theirs — export on request.

### The first client — Dekor_for_Events

He is your **founding partner**: the product is being designed around his
workshop and his feedback.

- Monthly price **locked** for him (e.g. 20 €) as long as he stays
- He sets up his own shop like everyone else — the wizard gets tested on him
- In return: permission to show his shop as an example, a testimonial, and
  introductions to his friends in the business
- Referral: **one free month for every business he brings** that pays

Put this in a one-page written agreement (price, what is included, data
ownership, what happens on non-payment) before the second business exists.

### Platform name

The platform needs its own name, domain and WhatsApp sender name — it must not
carry any client's name, or the second client will feel they are using a
competitor's software.

Guidelines:
- Short, easy to say in Albanian, `.al` and `.com` both available
- If you want to expand to other rentals later (§ Honest economics), **avoid
  "dekor" in the name** — e.g. something around *rezervo / qira / festë / event*
- Check domain availability and that no existing Albanian business uses it
  before printing anything

### Honest economics
Hosting is a fixed cost shared by all businesses (roughly 10–50 €/month
depending on stack, §13), plus small WhatsApp fees. Break-even is around **2
paying businesses**; after that each new one is almost pure margin.

The ceiling is the number of decor workshops in Albania — likely dozens, not
hundreds. **The same engine fits any business that rents physical things by
date**: party equipment, chairs/tables/tents, photo booths, inflatables,
wedding props, costume rental. Keep naming and UI generic enough
("artikuj me qira") that you can sell to those later without a rewrite.

---

## 13. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Shop + admin in one codebase, great image handling |
| UI | Tailwind + shadcn/ui | Per-business theming via CSS variables |
| DB | Postgres | `daterange` + `EXCLUDE` constraints + RLS — exactly what this needs |
| ORM | Drizzle | Typed, and does not fight raw SQL for the availability query |
| Auth | Owner/staff: email + password. Customers: none. | No customer accounts — name + phone is enough |
| Images | S3-compatible storage (Cloudflare R2) + `next/image` | Photo-heavy catalog; serve WebP/AVIF for 4G users |
| i18n | next-intl, `sq` only for now | Strings in one file, easy to add `en` later |
| Notifications | WhatsApp Cloud API + Web Push (PWA) | §9 |
| Jobs | Cron (hold expiry, reminders, daily summary) | |
| Hosting | **Option A:** Vercel + Supabase (~45 €/mo, zero ops) · **Option B:** one VPS with Coolify + Postgres (~10 €/mo, you run it) | At 25 €/business, Option B reaches profit sooner |

**Alternative:** Laravel + Filament — Filament gives a strong admin panel for
almost free. Choose it if you are faster in PHP; the plan does not change.

---

## 14. Phasing

**Faza 1 — MVP for Dekor_for_Events (3–4 javë)**
Built single-business but **with `biznes_id` on every table from day one**.
- Catalog, product pages, photos, availability calendar, date-first search
- Product options: colour palette, text/number fields, notes, inspiration photos
- Reservation form → (approval if special requests) → 48 h hold → confirmation screen
- Work sheet ("Fletë pune") per reservation
- Admin: reservations, calendar, products, "Kapari u pagua", extend/refuse, cash log
- WhatsApp alert to owner + web push backup
- Hold expiry job, T&C page
- Start Meta Business verification in week 1

**Faza 2 — Multi-business (2–3 javë)**
Subdomain routing, RLS, branding settings, first-run wizard, super-admin
(create account + invite), owner-granted support access, free trial,
subscription paid-until + grace period. The first friend sets up his own shop.

**Faza 3 — Growth**
Custom-order production tracker with stage photos, buy flows, packages,
waitlist, condition photos at handover/return, contract PDF, reports,
own-domain support, customer WhatsApp messages.

---

## 15. Improvement ideas (backlog)

**Fewer phone calls**
1. Date-first browsing on the homepage
2. Production tracker with stage photos
3. QR sticker on each structure → its page and calendar
4. Daily 08:00 WhatsApp summary to the owner

**More revenue**
5. Packages ("Paketa K-Pop": arkadë + tavolina + sfond)
6. Waitlist — expired/cancelled date → notify everyone who wanted it
7. Weekend & high-season pricing (Qershor–Shtator, Pre–Die)
8. Delivery zones with fixed fees per city
9. Add-ons: balona, ndriçim, montim në vend
10. Reviews with customer photos

**Less risk**
11. Contract PDF in Albanian, signed at pickup
12. Condition photos at handover and return — ends damage disputes
13. Maintenance status hides damaged items automatically
14. Blocked dates (holidays, private jobs)
15. Audit log once there is staff

**Platform growth (you)**
16. Self-service Instagram importer: the owner picks posts from his own
    Instagram → they become draft products he then completes
17. Albanian SEO per city ("dekor ditëlindjeje Tiranë", "arkadë dasme me qira")
18. Opt-in directory `/zbulo` once ≥5 businesses
19. Extend to other date-based rentals (party equipment, tents, photo booths)

---

## 16. Still open with the client

1. **Kapari:** 30% / min 3.000 L — or what does he take today?
2. **Hold time:** is 48 h right for customers outside Tirana?
3. **Transport:** does he deliver and set up? Priced by city, by km, or flat?
4. **Duplicates:** does he own more than one of any item?
5. **Buffers:** how many days before/after an event is a big arch tied up?
6. **Currency:** does he quote prices in Lek or in Euro?
7. **Buying:** when someone buys, is it usually a new copy made for them, or the
   actual piece from his stock?
8. **Colours on rentals:** does he repaint rented items for a customer? If yes,
   how many extra days and what extra price?
9. **His colour palette:** which colours does he offer? (Becomes the starting
   palette in his settings.)
10. **Text/letters:** are names and numbers (like "ETUAL 5") separate pieces he
    makes per event, and how are they priced?
