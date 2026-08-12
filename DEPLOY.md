# Handover checklist

The site is being built and tested on personal accounts, then handed to GCCA
Calgary. **Every value that has to change at that point is listed here.** If a
value is developer-owned, it is in this file.

Work top to bottom on the day of handover. Nothing here is optional — a missed
row means submissions land in the wrong inbox, or money lands in the wrong
account.

---

## 1. The forms spreadsheets

There are **three**, plus the Apps Script project that writes to them.

| What | Now | At handover |
|---|---|---|
| `GCCA — Membership` owner | `dardax86@gmail.com` | `gccacalgary@gmail.com` |
| `GCCA — Event registrations` owner | `dardax86@gmail.com` | `gccacalgary@gmail.com` |
| `GCCA — Inquiries` owner | `dardax86@gmail.com` | `gccacalgary@gmail.com` |
| `SPREADSHEETS` ids in `apps-script/Code.gs` | dev spreadsheet ids | unchanged, *if* ownership is transferred rather than the sheets recreated |
| `TREASURER_EMAIL` in `apps-script/Code.gs` | `dardax86@gmail.com` | the treasurer's address |
| `SHEET_ENDPOINT` in `js/script.js` | dev deployment `/exec` URL | the GCCA deployment `/exec` URL |

**Transfer ownership rather than recreating.** A transferred spreadsheet keeps
its ID, so the script keeps working and no data is lost. Recreating them means
new IDs, re-pasting all three, and orphaning every registration taken so far.

File → Share → the person's name → **Transfer ownership**, on each of the three.

Then re-deploy the script from the GCCA account, which produces a **new `/exec`
URL** — that is why `SHEET_ENDPOINT` also changes.

- [ ] All three spreadsheets transferred to `gccacalgary@gmail.com`
- [ ] Lorlene given **edit** access to each, not view
- [ ] `TREASURER_EMAIL` changed and a **new version** deployed
- [ ] `SHEET_ENDPOINT` updated in `js/script.js`
- [ ] `SITE_URL` in `apps-script/Reminders.gs` set to the live domain —
      it is the "renew now" link in every reminder email
- [ ] `installRenewalTrigger` re-run **from the GCCA account**. Triggers belong
      to whoever created them, so the dev account's trigger stops working once
      ownership moves, and reminders would silently never send
- [ ] `testAlerts` run from the GCCA account — email arrives at the treasurer
- [ ] A real registration submitted end to end and the tab checked
- [ ] One event tab printed, to confirm it works as a guest list

---

## 2. Square

| What | Now | At handover |
|---|---|---|
| Square account | developer sandbox | GCCA's live Square account |
| `SQUARE_ACCESS_TOKEN` | sandbox token | **production** token |
| `SQUARE_LOCATION_ID` | sandbox location | GCCA's location |
| `SQUARE_ENVIRONMENT` | `sandbox` | `production` |
| `SITE_URL` | preview URL | `https://gccacalgary.ca` |

**Keys are set in the Vercel dashboard by GCCA, not pasted into any file and not
sent over email or chat.** Vercel → Project → Settings → Environment Variables.
Anything committed to the repo is public the moment the repo is.

- [ ] GCCA Square account created under `gccacalgary@gmail.com`
- [ ] Production keys entered in Vercel by GCCA
- [ ] `SQUARE_ENVIRONMENT` flipped to `production`
- [ ] Sandbox keys deleted from any local `.env`
- [ ] **One real payment of a few dollars, refunded afterwards** — the only way
      to prove money actually reaches their account

---

## 3. Domain and email

| What | Now | At handover |
|---|---|---|
| Address | Vercel preview URL | `gccacalgary.ca` |
| Contact address on the site | `gccacalgary@gmail.com` | unchanged, or `info@gccacalgary.ca` if M365 lands |

The site currently shows `gccacalgary@gmail.com` in the footer of every page, on
the policy page, on the by-laws page and in the membership section. If they move
to Microsoft 365 addresses, all of those change together.

- [ ] `gccacalgary.ca` registered and pointed at Vercel
- [ ] `SITE_URL` environment variable updated
- [ ] Redirect from the Vercel URL to the domain
- [ ] Email addresses across the site updated if M365 has landed

---

## 4. Content still owed by GCCA

Not technical, but the site is not finished without them.

- [x] ~~Membership terms wording~~ — received, on the membership form
- [x] ~~Volunteer options list~~ — received, on the membership form
- [x] ~~Contact consent line~~ — received
- [ ] Event photos, replacing the labelled placeholders (11 events)
- [ ] Culture detail images (3)
- [ ] Founding members' names and milestone dates for the About page
- [ ] Executive headshots — most are still initials
- [ ] A GCCA favicon — the current one is the starter template's
- [ ] Confirmation of the refund tiers (see below)
- [ ] Whether the **event registration** form needs its own terms block.
      Everything received so far is membership-specific.

---

## 5. Decisions taken on GCCA's behalf

Assumptions made to keep the build moving. Each is a one-line change. Confirm
them before go-live.

| Decision | Status | Where to change it |
|---|---|---|
| Meal charge, **$5 per person**, adults and children 2 and over | **Confirmed** by Lorlene | `mealCount` in `js/script.js` |
| Renewal reminders on **1 Apr, 23 Apr, 24 May** | **Confirmed** by Lorlene | reminder script |
| Meal at Special General Meeting | Assumed offered, as at the other meetings | `meal: 5` in `js/events-data.js` |
| Special-tier events | Assumed: Carifest, Taste of Guyana, Christmas Party, Independence Gala | `special: true` in `js/events-data.js` |
| Stampede Golf & BBQ | Assumed standard tier, despite being catered | same |
| Volunteer Appreciation Dinner | Assumed standard tier | same |
| By-laws Article 4(e) | Original text kept, 2013 amendment noted beside it | `bylaws.html` |

---

## 6. Last look before announcing

- [ ] Every form submitted once on the live site, rows checked in the sheet
- [ ] Alert emails arriving at the treasurer, not at a developer address
- [ ] A real payment taken and refunded
- [ ] No developer email address anywhere — search the repo for `dardax86`
- [ ] Sheet shared with Lorlene
