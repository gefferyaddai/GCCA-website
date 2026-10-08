/* ==========================================================================
   POST /api/square-webhook
   --------------------------------------------------------------------------
   Square calls this when a payment changes. When one COMPLETES, the matching
   row in the spreadsheet is marked "Paid".

   Why this exists: the spreadsheet row is written BEFORE anyone is sent to
   Square (see the registration handler in js/script.js), so that a payment can
   never arrive with no record of who made it. The cost of that order is that
   an abandoned checkout — a closed tab, an in-app browser that drops, a card
   declined — leaves a row that looks just like a paid one. This is the half
   that tells them apart: rows start as "Awaiting payment" and only become
   "Paid" when Square itself says so.

   The redirect back to the site is NOT used for this. It never fires when the
   app drops, and anyone can type ?registration=success into the address bar.

   ENVIRONMENT VARIABLES (Vercel → Settings → Environment Variables):
     SQUARE_WEBHOOK_SIGNATURE_KEY  from the webhook subscription in the Square
                                   Developer dashboard
     SQUARE_WEBHOOK_URL            the notification URL exactly as entered in
                                   that subscription, e.g.
                                   https://gccacalgary.com/api/square-webhook
                                   — Square signs this string, so it must match
                                   character for character
     FORMS_ENDPOINT                the Apps Script /exec URL (same one as
                                   SHEET_ENDPOINT in js/script.js)
     FORMS_PAYMENT_SECRET          any long random string; the same value goes
                                   in Apps Script → Script Properties →
                                   PAYMENT_SECRET

   See DEPLOY.md.
   ========================================================================== */

const crypto = require('crypto');

/* The signature is over the exact bytes Square sent, so the body has to be
   read raw. Vercel parses req.body lazily — as long as nothing touches it,
   the stream is still there to read. */
async function rawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    return Buffer.concat(chunks).toString('utf8');
}

/* Square: base64( HMAC-SHA256( key, notificationUrl + body ) ). */
function signatureValid(signature, body, key, url) {
    if (!signature || !key || !url) return false;
    const expected = crypto.createHmac('sha256', key).update(url + body).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    const url = process.env.SQUARE_WEBHOOK_URL;
    const forms = process.env.FORMS_ENDPOINT;
    const secret = process.env.FORMS_PAYMENT_SECRET;

    if (!key || !url || !forms || !secret) {
        console.error('[webhook] not configured — see DEPLOY.md');
        return res.status(500).json({ error: 'Webhook is not configured.' });
    }

    const body = await rawBody(req);
    if (!signatureValid(req.headers['x-square-hmacsha256-signature'], body, key, url)) {
        console.warn('[webhook] bad signature, ignored');
        return res.status(403).json({ error: 'Invalid signature.' });
    }

    let event;
    try {
        event = JSON.parse(body);
    } catch (error) {
        return res.status(400).json({ error: 'Body is not JSON.' });
    }

    /* Subscribed to payment.created and payment.updated. Only a COMPLETED
       payment means money was actually taken; APPROVED, PENDING, FAILED and
       CANCELED all leave the row as "Awaiting payment". */
    const payment = event && event.data && event.data.object && event.data.object.payment;
    if (!payment || payment.status !== 'COMPLETED' || !payment.order_id) {
        return res.status(200).json({ ok: true, ignored: true });
    }

    const amount = payment.amount_money
        ? (payment.amount_money.amount / 100).toFixed(2) + ' ' + payment.amount_money.currency
        : '';

    try {
        /* text/plain for the same reason as postJSON in js/script.js: it is
           what the Apps Script web app reads as postData.contents. fetch
           follows Google's redirect to the response on its own. */
        const response = await fetch(forms, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                type: 'payment',
                secret: secret,
                orderId: payment.order_id,
                paymentId: payment.id,
                amount: amount,
                paidAt: payment.updated_at || payment.created_at
            })
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.ok) {
            throw new Error(result.error || 'Apps Script answered ' + response.status);
        }
        if (!result.matched) console.warn('[webhook] no row for order', payment.order_id);

        return res.status(200).json({ ok: true });
    } catch (error) {
        /* Anything other than a 2xx makes Square try again later, which is
           exactly what is wanted if the spreadsheet was briefly unreachable. */
        console.error('[webhook] could not mark paid:', error);
        return res.status(502).json({ error: 'Could not record payment.' });
    }
};
