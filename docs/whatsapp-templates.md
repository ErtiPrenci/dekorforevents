# WhatsApp templates

Register these in **Meta Business Manager → WhatsApp Manager → Message templates**
for the platform's WhatsApp Business number. Category: **Utility**. Language:
**Albanian (sq)**. Names must match exactly — the code sends them by name.

Template variables (`{{1}}`, `{{2}}`, …) are filled by `src/lib/notify/index.ts`.
They are single-line: WhatsApp rejects parameters containing newlines.

---

## `rezervim_i_ri` — new reservation (to the owner)

```
🔔 Rezervim i ri — {{1}}
{{2}} · {{3}}
🎨 {{4}}
{{5}}
Klienti: {{6}}
Kapari: {{7}}
👉 {{8}}
```

| Var | Example |
|---|---|
| 1 | DFE-2026-0142 |
| 2 | Arkadë me valë, 2× Tavolinë lule |
| 3 | e shtunë, 12 qershor 2026 |
| 4 | Ngjyra: Rozë pastel · Emri: ETUAL |
| 5 | ⚠️ Ka kërkesa të veçanta — kërkon aprovim |
| 6 | Ana Hoxha · 069 123 4567 |
| 7 | 6.000 L — afati 14 qershor, ora 18:00 |
| 8 | https://…/admin/rezervimet/… |

## `afati_po_skadon` — hold expires within 6 hours (to the owner)

```
⏰ Afati po skadon — {{1}}
{{2}} nuk ka paguar ende kaparin ({{3}}).
Afati: {{4}}
👉 {{5}}
```

## `permbledhje_ditore` — daily 08:00 summary (to the owner)

```
☀️ Përmbledhja e sotme — {{1}}
🚚 Dorëzime: {{2}}
↩️ Kthime: {{3}}
⏳ Kapare në pritje: {{4}}
❓ Për aprovim: {{5}}
👉 {{6}}
```

---

## Setup checklist

1. Meta Business account + business verification (takes days — start early).
2. Add a **dedicated phone number** for the platform to WhatsApp Business Platform
   (Cloud API). Display name = the platform name, never a client's name.
3. Create a permanent System User token with `whatsapp_business_messaging`.
4. Register the three templates above; wait for approval.
5. Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` in the environment.
6. In each business's admin → Cilësimet → "Dërgo njoftim prove" sends Meta's
   default `hello_world` template to verify the connection.

Until step 5 is done, every notification is still logged in the `njoftim`
table (status `ANASHKALUAR`) and web push keeps working.
