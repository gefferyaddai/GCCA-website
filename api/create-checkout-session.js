/* ==========================================================================
   POST /api/create-checkout-session
   --------------------------------------------------------------------------
   Creates a Stripe Checkout Session for either:
     • a donation  — { type:'donation', frequency:'one-time'|'monthly', amount }
     • a ticket order — { type:'registration', eventSlug, eventName, adults, youth, total }

   Deploy on Vercel. Requires:
     npm install stripe
     STRIPE_SECRET_KEY   in your Vercel environment variables
     SITE_URL            e.g. https://gccacalgary.ca  (no trailing slash)

   Never put the secret key in script.js — it belongs on the server only.
   ========================================================================== */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
});

const CURRENCY = 'cad';
const MIN_DONATION = 5;
const MAX_DONATION = 25000;

// Ticket prices live here, on the server, so nobody can edit them in the browser.
// Keep the slugs and the numbers identical to events-data.js.
// 0 means free (or price not announced yet) — those never reach Stripe.
const EVENTS = {
    'stampede-golf-bbq':             { name: 'Stampede Golf & BBQ',                             adult: 0, youth: 0 },
    'carifest':                      { name: 'Carifest',                                        adult: 0, youth: 0 },
    'rgm-september':                 { name: "Members' Regular General Meeting",                adult: 0, youth: 0 },
    'caribbean-sports-day':          { name: 'Caribbean Sports Day',                            adult: 0, youth: 0 },
    'taste-of-guyana':               { name: 'Taste of Guyana',                                 adult: 0, youth: 0 },
    'family-christmas-party':        { name: 'Family Christmas Party',                          adult: 0, youth: 0 },
    'bowling-pizza-party':           { name: 'Bowling & Pizza Party',                           adult: 0, youth: 0 },
    'rgm-games-night':               { name: "Members' Regular General Meeting & Games Night",  adult: 0, youth: 0 },
    'volunteer-appreciation-dinner': { name: 'Volunteer Appreciation Dinner',                   adult: 0, youth: 0 },
    'agm-election':                  { name: 'Annual General Meeting & Election',               adult: 0, youth: 0 },
    'independence-gala':             { name: 'Independence Dinner & Dance Gala',                adult: 0, youth: 0 }
};

const toCents = (dollars) => Math.round(Number(dollars) * 100);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    if (!site) return res.status(500).json({ error: 'SITE_URL is not configured' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    try {
        /* ---------------------------------------------------------------
           Donations
           --------------------------------------------------------------- */
        if (body.type === 'donation') {
            const amount = Number(body.amount);
            if (!Number.isFinite(amount) || amount < MIN_DONATION || amount > MAX_DONATION) {
                return res.status(400).json({ error: 'Donation must be between $5 and $25,000.' });
            }

            const monthly = body.frequency === 'monthly';

            const session = await stripe.checkout.sessions.create({
                mode: monthly ? 'subscription' : 'payment',
                line_items: [{
                    quantity: 1,
                    price_data: {
                        currency: CURRENCY,
                        unit_amount: toCents(amount),
                        product_data: {
                            name: monthly ? 'Monthly donation to GCCA Calgary' : 'Donation to GCCA Calgary',
                            description: 'Supporting Guyanese cultural programming in Calgary.'
                        },
                        ...(monthly ? { recurring: { interval: 'month' } } : {})
                    }
                }],
                billing_address_collection: 'auto',
                success_url: `${site}/index.html?donation=success`,
                cancel_url:  `${site}/index.html?donation=cancelled#donate`,
                metadata: { kind: 'donation', frequency: monthly ? 'monthly' : 'one-time' }
            });

            return res.status(200).json({ url: session.url });
        }

        /* ---------------------------------------------------------------
           Event tickets
           --------------------------------------------------------------- */
        if (body.type === 'registration') {
            const event = EVENTS[body.eventSlug];
            if (!event) return res.status(400).json({ error: 'Unknown event.' });

            const adults = Math.max(0, Math.min(20, Math.round(Number(body.adults) || 0)));
            const youth  = Math.max(0, Math.min(20, Math.round(Number(body.youth)  || 0)));
            if (adults + youth < 1) return res.status(400).json({ error: 'Add at least one ticket.' });

            const line_items = [];
            if (adults > 0 && event.adult > 0) {
                line_items.push({
                    quantity: adults,
                    price_data: {
                        currency: CURRENCY,
                        unit_amount: toCents(event.adult),
                        product_data: { name: `${event.name} — adult admission` }
                    }
                });
            }
            if (youth > 0 && event.youth > 0) {
                line_items.push({
                    quantity: youth,
                    price_data: {
                        currency: CURRENCY,
                        unit_amount: toCents(event.youth),
                        product_data: { name: `${event.name} — youth admission (6–17)` }
                    }
                });
            }

            if (!line_items.length) {
                return res.status(400).json({ error: 'This event is free — no payment needed.' });
            }

            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                line_items,
                customer_email: body.email || undefined,
                phone_number_collection: { enabled: false },
                success_url: `${site}/events.html?registration=success`,
                cancel_url:  `${site}/events.html?registration=cancelled#register`,
                metadata: {
                    kind: 'registration',
                    event: body.eventSlug,
                    attendee: (body.name || '').slice(0, 120),
                    adults: String(adults),
                    youth: String(youth),
                    notes: (body.notes || '').slice(0, 400)
                }
            });

            return res.status(200).json({ url: session.url });
        }

        return res.status(400).json({ error: 'Unrecognised checkout type.' });
    } catch (error) {
        console.error('[stripe] checkout session failed:', error);
        return res.status(500).json({ error: 'Could not start checkout.' });
    }
};