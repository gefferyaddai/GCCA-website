/* ==========================================================================
   GCCA Calgary — membership renewal reminders
   --------------------------------------------------------------------------
   The membership year runs 1 May to 30 April. Three reminders go out, at the
   times the executive asked for:

     1 April   — a month before the year ends
     23 April  — a week before dues are due
     24 May    — a week before the end of the first month of the new year

   The first goes to every member of the outgoing year. The second and third go
   only to those who have not renewed yet, so nobody who has already paid keeps
   being chased.

   A single daily trigger runs sendRenewalReminders(). It checks the date and
   does nothing on the other 362 days. One trigger is easier to reason about,
   and to check, than three.

   SETUP: run installRenewalTrigger() once from the editor.
   CHECK IT FIRST: run previewRenewalReminders() — it reports who would be
   emailed and what, and sends nothing.

   This file relies on SPREADSHEETS, bookFor() and TREASURER_EMAIL in Code.gs.
   ========================================================================== */

/* Where "renew now" points. Update when the domain is live — see DEPLOY.md. */
const SITE_URL = 'https://gccacalgary.ca';

/* Which reminder goes out on which day, and the column that records it.
   Months are 1-based here for readability. */
const REMINDER_SCHEDULE = [
    { stage: 1, month: 4, day: 1,  column: 'Reminder 1 sent' },
    { stage: 2, month: 4, day: 23, column: 'Reminder 2 sent' },
    { stage: 3, month: 5, day: 24, column: 'Reminder 3 sent' }
];

/* ==========================================================================
   RUN THIS FIRST — reports what would happen today, and on each of the three
   reminder days, without sending anything at all.
   ========================================================================== */
function previewRenewalReminders() {
    const lines = [];

    REMINDER_SCHEDULE.forEach(step => {
        /* Pretend it is that day of the current year, so the report is useful
           whatever day it is actually run. */
        const pretend = new Date();
        pretend.setMonth(step.month - 1, step.day);

        const due = whoNeedsReminding(pretend, step);
        lines.push('');
        lines.push('── ' + step.day + ' ' + monthName(step.month)
            + '  (reminder ' + step.stage + ')');
        lines.push('   would email ' + due.length + ' member'
            + (due.length === 1 ? '' : 's'));
        due.slice(0, 25).forEach(m => lines.push('     · ' + m.name + '  <' + m.email + '>'));
        if (due.length > 25) lines.push('     … and ' + (due.length - 25) + ' more');
    });

    const report = 'RENEWAL REMINDER PREVIEW — nothing was sent.\n'
        + lines.join('\n')
        + '\n\nDaily email quota left on this account: '
        + MailApp.getRemainingDailyQuota();

    console.log(report);
    throw new Error(report);      // shown on screen, where the log is easy to miss
}

/* ==========================================================================
   The daily job. Does nothing unless today is one of the three dates.
   ========================================================================== */
function sendRenewalReminders() {
    const today = new Date();
    const step = REMINDER_SCHEDULE.filter(s =>
        s.month === today.getMonth() + 1 && s.day === today.getDate())[0];

    if (!step) return;                       // not a reminder day

    const due = whoNeedsReminding(today, step);
    if (!due.length) {
        console.log('Reminder ' + step.stage + ': nobody to remind.');
        return;
    }

    /* A consumer Gmail account can send 100 emails a day. Running out halfway
       would leave half the membership chased and half not, with no record of
       where it stopped — so refuse to start rather than end up in that state. */
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < due.length) {
        const message = 'Reminder ' + step.stage + ' NOT sent: ' + due.length
            + ' members to email but only ' + quota + ' left in today\'s quota. '
            + 'Nothing was sent and nothing was marked, so this can be re-run '
            + 'tomorrow, or the account upgraded to Google Workspace.';
        console.error(message);
        MailApp.sendEmail(TREASURER_EMAIL, 'GCCA renewal reminders could not be sent', message);
        return;
    }

    const sheet = membersSheet();
    const stamp = new Date();
    let sent = 0;

    due.forEach(member => {
        try {
            MailApp.sendEmail({
                to: member.email,
                name: 'GCCA Calgary',
                replyTo: TREASURER_EMAIL,
                subject: reminderSubject(step.stage, member),
                body: reminderBody(step.stage, member)
            });
            /* Marked only after the send succeeds, so a failure means they are
               picked up again rather than silently skipped. Every row for this
               member is stamped, not just the first. */
            member.rows.forEach(row => {
                sheet.getRange(row, member.markColumn).setValue(stamp);
            });
            sent++;
        } catch (err) {
            console.error('Could not email ' + member.email + ': ' + err);
        }
    });

    console.log('Reminder ' + step.stage + ': emailed ' + sent + ' of ' + due.length + '.');
}

/* ==========================================================================
   Who still needs chasing
   ========================================================================== */
function whoNeedsReminding(when, step) {
    const sheet = membersSheet();
    if (sheet.getLastRow() < 2) return [];

    const values = sheet.getDataRange().getValues();
    const headings = values[0].map(h => String(h).trim());
    const at = (name) => headings.indexOf(name);

    const colStarts = at('Year starts');
    const colEmail  = at('Email');
    const colName   = at('Name');
    const colMark   = at(step.column);

    if (colStarts < 0 || colEmail < 0 || colMark < 0) {
        throw new Error('The Members tab is missing one of these columns: '
            + '"Year starts", "Email", "' + step.column + '".');
    }

    /* Both reminder months — April and May — fall in the calendar year the new
       membership year begins. So the year being renewed INTO is always this
       calendar year, and the year running out started last May. */
    const incoming = when.getFullYear() + '-05-01';
    const outgoing = (when.getFullYear() - 1) + '-05-01';

    /* Anyone who has already applied for the incoming year is done with. */
    const renewed = {};
    values.slice(1).forEach(row => {
        if (asDateString(row[colStarts]) === incoming) {
            renewed[emailKey(row[colEmail])] = true;
        }
    });

    /* Group the outgoing year's rows by member, because the same person can
       appear more than once — a re-submitted application, or a correction. All
       of their rows have to be marked together, or the unmarked duplicate
       triggers a second email on the next run and the member is chased twice. */
    const byEmail = {};

    values.slice(1).forEach((row, index) => {
        if (asDateString(row[colStarts]) !== outgoing) return;   // not last year's member

        const email = emailKey(row[colEmail]);
        if (!email) return;

        if (!byEmail[email]) {
            byEmail[email] = {
                rows: [],
                markColumn: colMark + 1,
                reminded: false,
                name: String(row[colName] || '').trim() || 'there',
                email: String(row[colEmail]).trim(),
                outgoingYear: yearLabel(when.getFullYear() - 1),
                incomingYear: yearLabel(when.getFullYear())
            };
        }

        byEmail[email].rows.push(index + 2);                     // +1 heading, +1 to 1-based
        if (String(row[colMark] || '').trim()) byEmail[email].reminded = true;
    });

    return Object.keys(byEmail)
        .filter(email => !renewed[email] && !byEmail[email].reminded)
        .map(email => byEmail[email]);
}

/* ==========================================================================
   What the reminders say

   DRAFT WORDING — for the executive to approve or rewrite. Everything a member
   reads is in this one function, so changing the tone means editing here and
   nothing else.
   ========================================================================== */
function reminderSubject(stage, member) {
    if (stage === 1) return 'Your GCCA membership renews on 1 May';
    if (stage === 2) return 'A week to go — GCCA membership renewal';
    return 'Have you renewed your GCCA membership?';
}

function reminderBody(stage, member) {
    const hello = 'Hello ' + firstName(member.name) + ',';
    const sign = ['', '',
        'Thank you for being part of the association.',
        '',
        'Guyana Canada Cultural Association (Calgary)',
        SITE_URL,
        ''].join('\n');

    if (stage === 1) {
        return [hello, '',
            'Your GCCA membership for ' + member.outgoingYear + ' comes to an end on 30 April,',
            'and the new membership year — ' + member.incomingYear + ' — begins on 1 May.',
            '',
            'You can renew any time from now on:',
            SITE_URL + '/#membership',
            '',
            'Renewing keeps your vote at general meetings, your place at members-only',
            'events, and the association running for another year.'
        ].join('\n') + sign;
    }

    if (stage === 2) {
        return [hello, '',
            'A quick reminder that GCCA membership dues for ' + member.incomingYear,
            'are due on 1 May — a week from now.',
            '',
            'Renew here, it takes a couple of minutes:',
            SITE_URL + '/#membership',
            '',
            'If you have already renewed since this was sent, please ignore it.'
        ].join('\n') + sign;
    }

    return [hello, '',
        'We have not yet received your GCCA membership renewal for ' + member.incomingYear + '.',
        '',
        'There is still time — renewing now keeps your membership unbroken, along',
        'with your vote at general meetings and your place at members-only events.',
        '',
        SITE_URL + '/#membership',
        '',
        'If you would rather not renew this year, no reply is needed, and you are',
        'always welcome back. If you think this has reached you in error, please',
        'let us know at ' + TREASURER_EMAIL + '.'
    ].join('\n') + sign;
}

/* ==========================================================================
   Setting up the daily trigger
   ========================================================================== */
function installRenewalTrigger() {
    /* Clear any previous one first, or every re-run adds another and members
       get the same reminder several times over. */
    ScriptApp.getProjectTriggers().forEach(trigger => {
        if (trigger.getHandlerFunction() === 'sendRenewalReminders') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    ScriptApp.newTrigger('sendRenewalReminders')
        .timeBased()
        .atHour(9)
        .everyDays(1)
        .create();

    const message = 'Renewal reminders are now scheduled.\n\n'
        + 'A check runs every morning around 9am and does nothing except on\n'
        + '1 April, 23 April and 24 May.\n\n'
        + 'Run previewRenewalReminders() any time to see who would be emailed.';
    console.log(message);
    throw new Error(message);      // shown on screen
}

/* Sends all three drafts to the treasurer so the wording can be read as a
   member would receive it. Touches no member data. */
function sendTestRenewalEmails() {
    const sample = {
        name: 'Aisha Persaud',
        email: TREASURER_EMAIL,
        outgoingYear: yearLabel(new Date().getFullYear() - 1),
        incomingYear: yearLabel(new Date().getFullYear())
    };

    [1, 2, 3].forEach(stage => {
        MailApp.sendEmail({
            to: TREASURER_EMAIL,
            name: 'GCCA Calgary',
            subject: '[DRAFT ' + stage + ' of 3] ' + reminderSubject(stage, sample),
            body: reminderBody(stage, sample)
        });
    });

    const message = 'Three draft reminders sent to ' + TREASURER_EMAIL + '.';
    console.log(message);
    throw new Error(message);
}

/* ==========================================================================
   Small helpers
   ========================================================================== */
function membersSheet() {
    const sheet = bookFor('membership').getSheetByName('Members');
    if (!sheet) throw new Error('No "Members" tab in the membership spreadsheet yet.');
    return sheet;
}

/* The Year starts column may hold text or a real date, depending on whether
   anybody has retyped it. Treat both the same. */
function asDateString(value) {
    if (value instanceof Date) {
        return value.getFullYear()
            + '-' + ('0' + (value.getMonth() + 1)).slice(-2)
            + '-' + ('0' + value.getDate()).slice(-2);
    }
    return String(value || '').trim().slice(0, 10);
}

function emailKey(value) {
    return String(value || '').trim().toLowerCase();
}

function firstName(full) {
    return String(full || '').trim().split(/\s+/)[0] || 'there';
}

function yearLabel(startYear) {
    return '1 May ' + startYear + ' – 30 April ' + (startYear + 1);
}

function monthName(month) {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'][month - 1];
}
