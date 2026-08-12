# The forms backend

Every form on the site posts to one Google Apps Script web app, which writes
into **three separate spreadsheets**:

| Spreadsheet | Holds | Shape |
|---|---|---|
| **GCCA — Membership** | Membership applications, fees, payments, renewals | One `Members` tab |
| **GCCA — Event registrations** | Event sign-ups | **One tab per event**, printable as the guest list |
| **GCCA — Inquiries** | Contact messages and newsletter signups | `Messages` and `Newsletter` tabs |

Three spreadsheets rather than one so each has a single job. The treasurer can
be given the membership sheet without exposing everyone's contact messages, and
the door team can print an event tab without seeing membership finances.

---

## The event tabs

A tab is created automatically the first time somebody registers for an event,
named after the event and the year — **`Carifest 2026`**. The year matters:
these events come round annually, and last year's guest list should not be
sitting above this year's.

The columns are ordered for the door. The first nine are:

> **Arrived** · Name · Adults · Children · Meals · Total owing · Payment status ·
> Payment method · Paid on

So printing the first page of a tab gives a working guest list — who is coming,
how many, whether they have paid, and a box to tick as they walk in. Emails,
consents and signatures trail behind, off the printed page.

**To print one:** open the event's tab, then File → Print → **Selected sheet**,
Landscape. The heading row repeats on every page.

---

## Setting it up

**1. Create the three spreadsheets**

Signed in as `dardax86@gmail.com`, go to <https://sheets.new> three times and
name them:

- `GCCA — Membership`
- `GCCA — Event registrations`
- `GCCA — Inquiries`

Leave them empty. The script builds the tabs.

**2. Collect the three IDs**

A spreadsheet's ID is the long string in its URL between `/d/` and `/edit`:

```
docs.google.com/spreadsheets/d/1a2B3cXyZ…long…string/edit
                              └────────── this part ──────────┘
```

**3. Paste them into the script**

Open the Apps Script project you already deployed (**Extensions → Apps Script**
from the original spreadsheet), replace all of `Code.gs` with the version in
this folder, and fill in the three IDs at the top:

```js
const SPREADSHEETS = {
    membership: '1a2B3c…',
    events:     '4d5E6f…',
    inquiries:  '7g8H9i…'
};
```

Save.

**4. Run `setup`**

Pick **`setup`** from the function dropdown and press **Run**.

It now needs permission to open *other* spreadsheets, so Google will ask again
even though you approved it before. Same path: **Advanced → Go to (project
name) (unsafe)**.

Check the execution log. It should list all three by name:

```
Connected to:
  membership: GCCA — Membership
  events: GCCA — Event registrations
  inquiries: GCCA — Inquiries
```

If one throws, its ID is wrong or it belongs to a different account.

**5. Redeploy**

**Deploy → Manage deployments → pencil icon → Version: New version → Deploy.**

The URL stays the same, so nothing on the site changes.

> **Do not create a *new deployment*.** That mints a new URL, and the site would
> keep posting to the old code. Always "New version" on the existing one.

**6. The original spreadsheet**

The one the script lives in is now just its container — nothing writes to it.
Delete its four tabs, or leave it. Don't delete the *spreadsheet*, or you delete
the script with it.

---

## Checking it works

**The endpoint:** open the `/exec` URL in a browser. You should see
`{"ok":true,"service":"GCCA Calgary forms"}`.

**The alerts:** run **`testAlerts`** from the editor. Two emails arrive showing
what the treasurer sees. Nothing is written to any spreadsheet.

**End to end:** submit a registration on the site and watch a tab appear.

---

## About the columns

Some are filled in by the script, some are deliberately blank for a human.

**Payment status / Payment method / Paid on** appear on both the event tabs and
the membership tab, so cash, cheque and e-transfer are recorded in the same
place as online payments. One list for the treasurer, not three.

**Arrived** is for the door — tick as people show up.

**Reminder 1/2/3 sent** on the membership tab are written by the
renewal-reminder script in a later stage. Don't fill these in by hand.

**Office notes** and **Replied** are free space for the executive.

---

## Renewal reminders

`Reminders.gs` chases members to renew, three times a year:

| Date | Goes to |
|---|---|
| **1 April** | Every member of the outgoing year |
| **23 April** | Only those who have not renewed yet |
| **24 May** | Only those who have not renewed yet |

One daily trigger runs at about 9am and does nothing on the other 362 days.
A member who has already applied for the new year is never chased, and each
reminder is stamped in the sheet so nobody gets the same one twice.

**Adding it:** in the script editor, click **+** beside *Files* → **Script**,
name it `Reminders`, and paste in `Reminders.gs` from this folder.

**Before switching it on, run these two:**

1. **`previewRenewalReminders`** — reports who would be emailed on each of the
   three dates, and sends nothing. Run this whenever you want reassurance.
2. **`sendTestRenewalEmails`** — sends all three drafts to the treasurer so the
   wording can be read exactly as a member would receive it.

**Switching it on:** run **`installRenewalTrigger`** once. It clears any
previous trigger first, so running it twice is safe — without that, every run
would add another trigger and members would get duplicate emails.

Changing the wording means editing `reminderSubject` and `reminderBody`. All
the member-facing text is in those two functions and nowhere else.

### One limit worth knowing

A consumer Gmail account can send **100 emails a day**. If the membership ever
exceeds that, the job refuses to start rather than email half the list and lose
track of where it stopped — it emails the treasurer instead. The fix at that
point is Google Workspace, which raises the limit to 1,500.

---

## Changing the code later

Editing `Code.gs` changes nothing on its own — a deployed web app keeps running
the version it was deployed with. Every edit needs
**Deploy → Manage deployments → pencil → New version**.

---

## Before handing over to GCCA

`TREASURER_EMAIL` at the top of `Code.gs` is the development address, and all
three spreadsheets are owned by a personal account. The full handover checklist
is in `DEPLOY.md` in the repo root.
