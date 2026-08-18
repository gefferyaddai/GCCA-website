/* ==========================================================================
   POST /api/create-checkout-session
   --------------------------------------------------------------------------
   Creates a Square-hosted payment link and returns { url }. The browser sends
   people there to pay; card details never touch this site, which keeps the
   association out of PCI scope entirely.

   Handles both:
     { type: 'registration', eventSlug, adults, youth, meals, ... }
     { type: 'membership',   category, ... }

   PRICES ARE SET HERE, ON THE SERVER. Whatever the browser claims something
   costs is ignored — otherwise anyone could edit the page and pay a penny.

   Talks to Square's REST API with plain fetch rather than the SDK: one less
   dependency to keep in step, and nothing to break when the SDK is reshaped.

   ENVIRONMENT VARIABLES (Vercel → Settings → Environment Variables):
     SQUARE_ACCESS_TOKEN   sandbox token now, production token at go-live
     SQUARE_LOCATION_ID    the location money is taken against
     SQUARE_ENVIRONMENT    'sandbox' or 'production'
     SITE_URL              e.g. https://gccacalgary.ca  (no trailing slash)

   Never commit any of these. See DEPLOY.md.
   ========================================================================== */

const SQUARE_VERSION = '2026-07-15';
const CURRENCY = 'CAD';

/* Square's Canadian online rate, confirmed August 2026 at squareup.com/ca.
   The executives chose to pass this on rather than absorb it, so it is added
   as a visible line on the checkout page — see feeOn() below. If GCCA ever
   decides to absorb it instead, set PASS_ON_FEE to false and nothing else
   changes. Cards issued outside Canada cost a further 1.5%, which is not
   predictable at checkout and is absorbed either way. */
const FEE_PERCENT = 0.028;
const FEE_FIXED_CENTS = 30;
const PASS_ON_FEE = true;

/* Ticket prices, in dollars. Keep the slugs and numbers identical to
   js/events-data.js — these are the ones that actually charge. */
const EVENTS = {
    'stampede-golf-bbq':             { name: 'Stampede Golf & BBQ',                             adult: 0,  youth: 0 },
    'carifest':                      { name: 'Carifest (parade costume)',                       adult: 50, youth: 30 },
    'rgm-september':                 { name: "Members' Regular General Meeting",                adult: 0,  youth: 0, meal: 5 },
    'caribbean-sports-day':          { name: 'Caribbean Sports Day',                            adult: 0,  youth: 0 },
    'taste-of-guyana':               { name: 'Taste of Guyana',                                 adult: 0,  youth: 0 },
    'family-christmas-party':        { name: 'Family Christmas Party',                          adult: 0,  youth: 0 },
    'bowling-pizza-party':           { name: 'Bowling & Pizza Party',                           adult: 0,  youth: 0 },
    'rgm-games-night':               { name: "Members' Regular General Meeting & Games Night",  adult: 0,  youth: 0, meal: 5 },
    'volunteer-appreciation-dinner': { name: 'Volunteer Appreciation Dinner',                   adult: 0,  youth: 0 },
    'agm-election':                  { name: 'Annual General Meeting & Election',               adult: 0,  youth: 0, meal: 5 },
    'independence-gala':             { name: 'Independence Dinner & Dance Gala',                adult: 0,  youth: 0 },
    'special-general-meeting':       { name: 'Special General Meeting',                         adult: 0,  youth: 0, meal: 5 }
};

/* Membership categories. Keep in step with the fee tiers on the home page and
   with Article 3 of the by-laws. */
const MEMBERSHIPS = {
    'family':        { name: 'Family membership',              fee: 20 },
    'individual':    { name: 'Individual membership (18+)',    fee: 10 },
    'senior-single': { name: 'Senior membership (65+)',        fee: 5 },
    'senior-couple': { name: 'Senior couple membership (65+)', fee: 10 },
    'student':       { name: 'Student membership (full-time)', fee: 5 }
};

const toCents = (dollars) => Math.round(Number(dollars) * 100);
const whole = (value, max) => Math.max(0, Math.min(max, Math.round(Number(value) || 0)));

/* What to add so that, after Square takes its cut, the association is left
   with the amount it actually asked for.

   Charging a flat 2.8% + 30¢ on top would fall short, because Square takes its
   percentage of the larger total too. Grossing up is the only way the numbers
   land: charge = (net + fixed) / (1 - percent). */
function feeOn(netCents) {
    if (!PASS_ON_FEE || netCents <= 0) return 0;
    const gross = Math.ceil((netCents + FEE_FIXED_CENTS) / (1 - FEE_PERCENT));
    return gross - netCents;
}

function lineItem(name, quantity, dollars) {
    return {
        name: name.slice(0, 500),
        quantity: String(quantity),
        base_price_money: { amount: toCents(dollars), currency: CURRENCY }
    };
}

/* Everything the checkout page needs, worked out from the slug and quantities
   only. Returns null when there is nothing chargeable. */
function buildOrder(body) {
    const items = [];
    let label = '';

    if (body.type === 'membership') {
        const category = MEMBERSHIPS[body.category];
        if (!category) throw new Error('Unknown membership category.');
        if (category.fee <= 0) return null;

        label = category.name;
        items.push(lineItem(category.name + ' — ' + (body.membershipYear || 'current year'), 1, category.fee));

    } else if (body.type === 'registration') {
        const event = EVENTS[body.eventSlug];
        if (!event) throw new Error('Unknown event.');

        const adults = whole(body.adults, 20);
        const youth  = whole(body.youth, 20);
        const meals  = whole(body.meals, 40);
        if (adults + youth < 1) throw new Error('Add at least one ticket.');

        label = event.name;
        if (adults > 0 && event.adult > 0) items.push(lineItem(event.name + ' — adult admission', adults, event.adult));
        if (youth  > 0 && event.youth > 0) items.push(lineItem(event.name + ' — child admission (2–17)', youth, event.youth));
        if (meals  > 0 && event.meal  > 0) items.push(lineItem(event.name + ' — meal', meals, event.meal));

    } else {
        throw new Error('Unrecognised checkout type.');
    }

    if (!items.length) return null;

    const net = items.reduce((sum, item) =>
        sum + item.base_price_money.amount * Number(item.quantity), 0);

    const fee = feeOn(net);
    if (fee > 0) {
        items.push({
            name: 'Card processing fee',
            quantity: '1',
            base_price_money: { amount: fee, currency: CURRENCY }
        });
    }

    return { items, label, net, fee };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = process.env.SQUARE_ACCESS_TOKEN;
    const location = process.env.SQUARE_LOCATION_ID;
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');

    if (!token || !location) return res.status(500).json({ error: 'Square is not configured.' });
    if (!site) return res.status(500).json({ error: 'SITE_URL is not configured.' });

    const host = process.env.SQUARE_ENVIRONMENT === 'production'
        ? 'https://connect.squareup.com'
        : 'https://connect.squareupsandbox.com';

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    let order;
    try {
        order = buildOrder(body);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
    if (!order) return res.status(400).json({ error: 'There is nothing to pay for.' });

    /* Where Square sends people afterwards. Membership lives on the home page,
       registrations on the events page. */
    const back = body.type === 'membership'
        ? site + '/index.html?membership=success#membership'
        : site + '/events.html?registration=success#register';

    /* Square is fussy about buyer_email — it rejects addresses whose domain it
       does not like, example.com among them. Pre-filling the email is only a
       convenience, so it must never be the reason somebody cannot pay: if
       Square objects to it, the request is sent again without it. */
    const askSquare = (withEmail) => fetch(host + '/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: {
            'Square-Version': SQUARE_VERSION,
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            /* Square rejects a repeat of the same key, which stops a
               double-click becoming two payment links. */
            idempotency_key: (body.type + '-' + Date.now() + '-' +
                Math.random().toString(36).slice(2, 10)).slice(0, 192),
            order: { location_id: location, line_items: order.items },
            checkout_options: { redirect_url: back, ask_for_shipping_address: false },
            pre_populated_data: withEmail ? { buyer_email: body.email } : undefined,
            payment_note: ('GCCA Calgary — ' + order.label).slice(0, 500)
        })
    });

    try {
        let response = await askSquare(Boolean(body.email));
        let data = await response.json();

        const emailRejected = (data.errors || []).some(e =>
            String(e.field || '').includes('buyer_email'));

        if (emailRejected) {
            console.warn('[square] buyer_email rejected, retrying without it');
            response = await askSquare(false);
            data = await response.json();
        }

        if (!response.ok || !data.payment_link) {
            console.error('[square] payment link failed:', JSON.stringify(data.errors || data));
            return res.status(502).json({ error: 'Could not start checkout.' });
        }

        return res.status(200).json({
            url: data.payment_link.long_url || data.payment_link.url,
            orderId: data.payment_link.order_id,
            total: (order.net + order.fee) / 100,
            fee: order.fee / 100
        });
    } catch (error) {
        console.error('[square] request threw:', error);
        return res.status(500).json({ error: 'Could not start checkout.' });
    }
};
