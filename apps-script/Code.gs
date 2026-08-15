/* ==========================================================================
   GCCA Calgary — form endpoint
   --------------------------------------------------------------------------
   One Apps Script web app behind every form on the site, writing into THREE
   separate spreadsheets so each one has a single job:

     1. Membership   — who has joined, what they owe, what they have paid
     2. Events       — one tab per event, printable as the guest list
     3. Inquiries    — contact messages and newsletter signups

   Keeping them apart means the treasurer can share the membership sheet
   without exposing everyone's contact messages, and the door team can print
   an event tab without seeing membership finances.

   SETUP: see README.md in this folder. Short version —
     1. Create the three spreadsheets, paste their IDs below.
     2. Run setup() once from the editor.
     3. Deploy > Manage deployments > New version (keeps the same URL).

   BEFORE GO-LIVE: change TREASURER_EMAIL and hand over the spreadsheets.
   See DEPLOY.md in the repo root.
   ========================================================================== */

/* --------------------------------------------------------------------------
   The three spreadsheets.

   Paste either the whole address bar or just the id — both work:

     https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv…/edit#gid=0
     1BxiMVs0XRA5nFMdKv…

   -------------------------------------------------------------------------- */
const SPREADSHEETS = {
    membership: '1c5b_gL0BtFyT3_O6cPqQ1jJsbkKBqk7TAb7YREz7KMA',   // GCCA — Membership
    events:     '1A1ZxTwCcIEGaHrjZcBjMAJLM_U_GKdq1sHMi-wijDX0',   // GCCA — Event registrations
    inquiries:  '1jDksrOJ99TGqJujZytZorYZdrQgdx069Dt0-SH8mdF8'    // GCCA — Inquiries
};

/* Bumped whenever the columns or the routing change. Returned by doGet, so
   opening the /exec URL shows which version is actually deployed — editing the
   file changes nothing until "New version" is pushed, and this is the only way
   to tell the two apart from outside. */
const VERSION = '2026-08-14a';

/* Who gets told when money is owed. Currently the development address —
   one of the values that changes at handover. */
const TREASURER_EMAIL = 'dardax86@gmail.com';

/* --------------------------------------------------------------------------
   Column layouts. Each is [heading, source], where source is a key from the
   posted payload, a function, or null for a column left blank on purpose so a
   human can fill it in.
   -------------------------------------------------------------------------- */

/* EVENTS — column order matters here. The first nine are what the door team
   needs, so printing the first page of a tab gives a working guest list:
   who is coming, how many, whether they have paid, and a box to tick when
   they walk in. Everything else trails behind it. */
const EVENT_COLUMNS = [
    ['Arrived',         null],
    ['Name',            'name'],
    ['Adults',          'adults'],
    ['Children',        'youth'],
    ['Meals',           'meals'],
    ['Total owing',     'total'],
    ['Payment status',  null],
    ['Payment method',  null],
    ['Paid on',         null],
    /* Square's reference for the order, so a payment in the Square dashboard
       can be matched to the person who made it. Blank for cash and cheque. */
    ['Square order',    'squareOrder'],
    ['Processing fee',  'processingFee'],
    ['Notes',           'notes'],
    ['Email',           'email'],
    ['Phone',           'phone'],
    ['Volunteering',    (d) => [].concat(d.volunteer || []).join(', ')],
    ['Registered on',   (d) => new Date()],
    ['Refund tier',     'refundTier'],
    ['Photo consent',   (d) => d.photoConsent === 'yes' ? 'Yes' : 'No'],
    ['Policy accepted', (d) => d.acceptsPolicy === 'yes' ? 'Yes' : 'No'],
    ['Signature',       'signature'],
    ['Signed at',       'signedAt'],
    ['Office notes',    null]
];

/* MEMBERSHIP — one tab, not one per year. Renewals are the whole point of this
   sheet, and "who has not renewed yet" is impossible to see if last year's
   members are on a different tab. */
const MEMBER_COLUMNS = [
    ['Name',            'name'],
    ['Category',        'categoryLabel'],
    ['Membership year', 'membershipYear'],
    ['Fee',             'fee'],
    ['Payment status',  null],
    ['Payment method',  null],
    ['Paid on',         null],
    /* Square's reference for the order, so a payment in the Square dashboard
       can be matched to the member. Blank for cash and cheque. */
    ['Square order',    'squareOrder'],
    ['Processing fee',  'processingFee'],
    ['Email',           'email'],
    ['Phone',           'phone'],
    ['Household',       'household'],
    /* Ticking a volunteer box is itself permission to be contacted about it,
       which is what the consent line above the boxes says. */
    ['Volunteering for', (d) => [].concat(d.volunteer || []).join(', ')],
    ['Applied on',      (d) => new Date()],
    ['Terms accepted',  (d) => d.acceptsTerms === 'yes' ? 'Yes' : 'No'],
    ['Signature',       'signature'],
    ['Signed at',       'signedAt'],
    ['Year starts',     'membershipYearStart'],
    ['Year ends',       'membershipYearEnd'],
    /* Written by the renewal-reminder script in a later stage so nobody is
       chased twice. Do not fill these in by hand. */
    ['Reminder 1 sent', null],
    ['Reminder 2 sent', null],
    ['Reminder 3 sent', null],
    ['Office notes',    null]
];

const CONTACT_COLUMNS = [
    ['Received',   (d) => new Date()],
    ['First name', 'firstName'],
    ['Last name',  'lastName'],
    ['Email',      'email'],
    ['Phone',      'phone'],
    ['Topic',      'topic'],
    ['Message',    'message'],
    ['Subscribed', (d) => d.subscribe === 'yes' ? 'Yes' : 'No'],
    ['From page',  'source'],
    ['Replied',    null]
];

const NEWSLETTER_COLUMNS = [
    ['Received',  (d) => new Date()],
    ['Email',     'email'],
    ['From page', 'source']
];

/* Where each form type goes. `tab` is a fixed name, or a function that works
   one out from the submission — that is how each event gets its own tab. */
const ROUTES = {
    registration: {
        book: 'events',
        tab: (d) => eventTabName(d),
        columns: EVENT_COLUMNS,
        alert: true
    },
    membership: {
        book: 'membership',
        tab: 'Members',
        columns: MEMBER_COLUMNS,
        alert: true
    },
    contact: {
        book: 'inquiries',
        tab: 'Messages',
        columns: CONTACT_COLUMNS,
        alert: false
    },
    newsletter: {
        book: 'inquiries',
        tab: 'Newsletter',
        columns: NEWSLETTER_COLUMNS,
        alert: false
    }
};

/* ==========================================================================
   RUN THIS FIRST — it is the default in the toolbar dropdown on purpose.

   Confirms all three spreadsheets can be opened and builds the fixed tabs.
   Event tabs are not created here; each appears when its first registration
   arrives.

   It ends by throwing a harmless "success" error. That is deliberate: an Apps
   Script log is easy to miss, but the result of a run is not. Seeing
   "SETUP OK" means every id is right.
   ========================================================================== */
function setup() {
    const found = [];

    Object.keys(SPREADSHEETS).forEach(key => {
        const book = bookFor(key);                   // throws if missing or unreachable
        found.push(key + ' → ' + book.getName());
    });

    sheetFor('membership', 'Members', MEMBER_COLUMNS);
    sheetFor('inquiries', 'Messages', CONTACT_COLUMNS);
    sheetFor('inquiries', 'Newsletter', NEWSLETTER_COLUMNS);

    const summary = 'SETUP OK — connected to:\n  ' + found.join('\n  ')
        + '\n\nTabs created. Event tabs appear as registrations arrive.'
        + '\nThis message is not a failure. Setup worked. Now redeploy:'
        + '\nDeploy > Manage deployments > pencil > Version: New version.';

    console.log(summary);
    throw new Error(summary);     // shown on screen, where the log is not
}

/* Sends one of each alert to TREASURER_EMAIL so you can see what the executive
   will actually receive, without writing anything to a spreadsheet. */
function testAlerts() {
    sendAlert('registration', {
        name: 'Test Person', email: 'test@example.com', phone: '403-555-0134',
        eventName: 'Taste of Guyana', adults: 2, youth: 1, meals: 0,
        total: 75, refundTier: 'special', notes: 'Vegetarian, please.'
    }, 'Taste of Guyana 2026');

    sendAlert('membership', {
        name: 'Test Person', email: 'test@example.com', phone: '403-555-0134',
        categoryLabel: 'Family — $20 / year', fee: 20,
        membershipYear: '1 May 2026 – 30 April 2027', household: 'Two adults, two children'
    }, 'Members');
}

/* ==========================================================================
   Entry points — these run when the site posts a form, not by hand.
   ========================================================================== */
function doPost(e) {
    /* Two people submitting in the same instant would otherwise race for the
       same row. Thirty seconds is far longer than an append ever takes. */
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);
    } catch (err) {
        return reply({ ok: false, error: 'Busy, please try again.' });
    }

    try {
        const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
        const type = data.type || 'contact';
        const route = ROUTES[type];

        if (!route) return reply({ ok: false, error: 'Unknown form type: ' + type });

        const tabName = typeof route.tab === 'function' ? route.tab(data) : route.tab;
        const sheet = sheetFor(route.book, tabName, route.columns);
        sheet.appendRow(route.columns.map(col => valueFor(col[1], data)));

        if (route.alert) sendAlert(type, data, tabName);

        return reply({ ok: true });
    } catch (err) {
        console.error('doPost failed:', err);
        return reply({ ok: false, error: String(err) });
    } finally {
        lock.releaseLock();
    }
}

/* A GET is only ever someone checking the deployment is alive, and which
   version of the code is really running. */
function doGet() {
    return reply({ ok: true, service: 'GCCA Calgary forms', version: VERSION });
}

/* ==========================================================================
   Helpers
   ========================================================================== */
function reply(payload) {
    return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
}

function valueFor(source, data) {
    if (source === null) return '';                  // left blank for humans
    if (typeof source === 'function') return source(data);
    const value = data[source];
    return (value === undefined || value === null) ? '' : value;
}

/* One tab per event, per year — "Carifest 2026". The year matters because
   these events come round annually, and last year's guest list should not be
   sitting above this year's. */
function eventTabName(data) {
    const name = String(data.eventName || 'Unnamed event');
    const year = String(data.eventDateISO || '').slice(0, 4);
    const label = year ? name + ' ' + year : name;

    /* Google forbids these characters in a tab name, and caps it at 100. */
    return label.replace(/[\[\]\:\*\?\/\\]/g, '').slice(0, 95).trim();
}

/* Accepts a bare id or a pasted address bar, so nobody has to pick the id out
   of a URL by eye. Everything between /d/ and the next slash is the id. */
function idFrom(value) {
    const text = String(value || '').trim();
    const match = text.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : text;
}

function bookFor(key) {
    const id = idFrom(SPREADSHEETS[key]);
    if (!id) throw new Error('Nothing set for "' + key + '" — see the top of Code.gs.');
    try {
        return SpreadsheetApp.openById(id);
    } catch (err) {
        throw new Error('Could not open the "' + key + '" spreadsheet (id: ' + id + '). '
            + 'Check it was created on this Google account and the link is right.');
    }
}

/* Finds the tab, creating it with headings if this is the first submission of
   that kind. A brand new event therefore makes its own guest list the moment
   somebody registers — nothing to set up in advance. */
function sheetFor(bookKey, tabName, columns) {
    const book = bookFor(bookKey);
    const headings = columns.map(col => col[0]);
    let sheet = book.getSheetByName(tabName);

    if (!sheet) sheet = book.insertSheet(tabName);

    if (sheet.getLastRow() === 0) {
        writeHeadings(sheet, headings);
        return sheet;
    }

    /* The tab already exists. If the columns in this file have changed since it
       was created, appending would quietly write every value under the wrong
       heading — the kind of fault nobody notices until the data is worthless.
       So check, and never write blind. */
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
        .map(h => String(h).trim());

    const matches = existing.length === headings.length
        && headings.every((h, i) => existing[i] === h);

    if (!matches) {
        if (sheet.getLastRow() === 1) {
            writeHeadings(sheet, headings);   // headings only, nothing to lose
            return sheet;
        }
        throw new Error(
            'The "' + tabName + '" tab was built with different columns to the ones '
            + 'this script now writes, so nothing has been saved rather than risk '
            + 'misaligning it.\n\nFix: rename that tab (e.g. "' + tabName + ' (old)") '
            + 'and a fresh one will be created with the right columns on the next '
            + 'submission. Copy anything you need across by hand.'
        );
    }

    return sheet;
}

function writeHeadings(sheet, headings) {
    sheet.getRange(1, 1, 1, headings.length).setValues([headings]);
    sheet.getRange(1, 1, 1, headings.length)
        .setFontWeight('bold')
        .setBackground('#F5F1E1');
    sheet.setFrozenRows(1);

    /* Set up for printing: the guest-list columns stay visible when the page
       breaks, and the heading row repeats on every printed sheet. */
    sheet.setFrozenColumns(Math.min(2, headings.length));
}

function sendAlert(type, data, tabName) {
    try {
        const isMember = type === 'membership';
        const who = data.name || data.email || 'Someone';

        const owing = Number(isMember ? data.fee : data.total) || 0;
        const money = owing > 0 ? '$' + owing.toFixed(2) + ' CAD' : 'nothing to pay';

        const lines = isMember
            ? ['Category: ' + (data.categoryLabel || ''),
               'Membership year: ' + (data.membershipYear || ''),
               'Fee: ' + money,
               'Household: ' + (data.household || '—')]
            : ['Event: ' + (data.eventName || ''),
               'Adults: ' + (data.adults || 0) + ', children: ' + (data.youth || 0),
               'Meals: ' + (data.meals || 0),
               'Total: ' + money,
               'Refund tier: ' + (data.refundTier || ''),
               'Notes: ' + (data.notes || '—')];

        const where = isMember
            ? 'The full row is on the "Members" tab of the GCCA membership spreadsheet.'
            : 'The full row is on the "' + tabName + '" tab of the GCCA events spreadsheet.';

        MailApp.sendEmail({
            to: TREASURER_EMAIL,
            subject: isMember
                ? 'New GCCA membership application — ' + who
                : 'New GCCA registration — ' + who + ', ' + (data.eventName || 'an event'),
            body: [
                who + ' has submitted a ' + (isMember ? 'membership application' : 'registration') + '.',
                '',
                'Email: ' + (data.email || ''),
                'Phone: ' + (data.phone || '—'),
                ''
            ].concat(lines).concat(['', where]).join('\n')
        });
    } catch (err) {
        /* An alert that fails must never lose the row that triggered it. */
        console.error('Alert email failed:', err);
    }
}

