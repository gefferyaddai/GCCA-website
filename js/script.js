/* ==========================================================================
   GCCA Calgary — script.js
   --------------------------------------------------------------------------
   Everything the site needs, in one file. Start by filling in CONFIG below.
   ========================================================================== */

/* The deployed Google Apps Script web app that receives every form on the site.
   Paste the /exec URL between the quotes and all four forms start working.
   Leave it empty and each form says so rather than silently losing anything.

   Deploying it: apps-script/README.md
   Changing it at handover: DEPLOY.md in the repo root. */
const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyJh6JlucMfV0gcQySAczG-amHNfcPOgkQpjnRNyGsxObzlTuWyhpoSi0H_hVzpmss/exec';

const CONFIG = {
    /* ---------------------------------------------------------------------
       1. Where forms post to. Leave a value empty and that form will tell you
          it isn't connected yet instead of silently swallowing submissions.

          All four form endpoints are the SAME Google Apps Script web app —
          it routes on the `type` field in the payload and writes each kind to
          its own tab. See apps-script/README.md for how to deploy it and get
          the URL, which ends in /exec.

          Paste it into SHEET_ENDPOINT below and every form comes alive at once.
       --------------------------------------------------------------------- */
    api: {
        contact:      SHEET_ENDPOINT,
        newsletter:   SHEET_ENDPOINT,
        registration: SHEET_ENDPOINT,
        membership:   SHEET_ENDPOINT,
        /* Square-hosted payment links. The keys live in Vercel's environment
           variables, never here — see api/create-checkout-session.js. */
        checkout:     '/api/create-checkout-session'
    },

    /* ---------------------------------------------------------------------
       2. Taking payment for tickets.

          The association has no payment processor connected yet. Until one
          is, leave api.checkout and paymentLinks empty: paid events collect
          the registration and tell the person the executive will be in touch
          about payment. Nothing is charged and no card details are handled.

          When a processor is chosen, either set api.checkout to a Checkout
          Session endpoint, or paste one hosted payment link per event slug
          below (the slug must match events-data.js).
       --------------------------------------------------------------------- */
    payments: {
        paymentLinks: {
            'carifest': ''
        }
    },

    /* ---------------------------------------------------------------------
       3. Optional external links.
          survey — a Google Form / SurveyMonkey URL for community feedback.
          Leave it empty and the "Tell us how we are doing" button drops
          people into the contact form with the feedback topic pre-selected.
       --------------------------------------------------------------------- */
    links: {
        survey: ''
    },

    currency: 'CAD',
    currencySymbol: '$'
};

/* ==========================================================================
   Small helpers
   ========================================================================== */
const $  = (sel, scope = document) => scope.querySelector(sel);
const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

const money = (value) => {
    const rounded = Math.round(Number(value) || 0);
    return CONFIG.currencySymbol + rounded.toLocaleString('en-CA');
};

function setStatus(el, message, state) {
    if (!el) return;
    el.textContent = message || '';
    if (state) el.setAttribute('data-state', state);
    else el.removeAttribute('data-state');
}

/* The membership year runs 1 May to 30 April. An application sent in, say,
   February belongs to the year that began the previous May — so the treasurer
   sees which year every payment covers without having to work it out. */
function membershipYear(today) {
    const now = today || new Date();
    const startYear = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
    return {
        label: '1 May ' + startYear + ' – 30 April ' + (startYear + 1),
        short: startYear + '/' + String(startYear + 1).slice(2),
        start: startYear + '-05-01',
        end:   (startYear + 1) + '-04-30'
    };
}

const longDay = (date) => date.toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' });

/* ==========================================================================
   Header, navigation, footer year
   ========================================================================== */
function initChrome() {
    $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

    const header = $('#siteHeader');
    if (header) {
        const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    const toggle = $('#navToggle');
    const nav = $('#primaryNav');
    if (!toggle || !nav) return;

    /* The menu covers the whole viewport on mobile, so the page behind it must
       stop scrolling — otherwise a swipe over the panel scrolls the article
       underneath and the visitor lands somewhere else on closing. */
    const setNav = (open) => {
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('nav-open', open);
    };

    const closeNav = () => setNav(false);

    toggle.addEventListener('click', () => {
        setNav(!nav.classList.contains('is-open'));
    });

    nav.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            closeNav();
            toggle.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (e.target.closest('#primaryNav') || e.target.closest('#navToggle')) return;
        closeNav();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 940) closeNav();
    });
}

/* ==========================================================================
   Scroll reveal
   ========================================================================== */
/* Held at module scope so content rendered later — the news headlines arrive
   after a network round trip, long after this has run — can still be handed to
   the same observer. Anything with .reveal that nobody observes stays at
   opacity 0 forever, which is a far worse bug than no animation. */
let revealObserver = null;

function initReveal() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced && 'IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }

    observeReveals();
}

/* Call after inserting markup that contains .reveal. With no observer — reduced
   motion, or a browser without IntersectionObserver — everything is simply
   shown. */
function observeReveals(root) {
    const items = $$('.reveal:not(.is-visible)', root || document);
    if (!revealObserver) {
        items.forEach(el => el.classList.add('is-visible'));
        return;
    }
    items.forEach(el => revealObserver.observe(el));
}

/* ==========================================================================
   Missing photos degrade into a labelled placeholder instead of a broken icon
   ========================================================================== */
function markImageMissing(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.failed) return;
    img.dataset.failed = 'true';

    const file = (img.getAttribute('src') || '').split('/').pop() || 'image';
    const holder = img.parentElement;
    if (!holder) return;

    holder.classList.add('media-fallback');
    holder.setAttribute('data-file', 'Add ' + file);
    img.style.visibility = 'hidden';
    if (!holder.style.minHeight && holder.offsetHeight < 80) holder.style.minHeight = '220px';
}

function initImageFallbacks() {
    // Images that fail later (including lazy-loaded ones).
    document.addEventListener('error', (event) => markImageMissing(event.target), true);

    // Images that already failed before this deferred script ran.
    $$('img').forEach(img => {
        if (img.complete && img.naturalWidth === 0) markImageMissing(img);
    });
}

/* ==========================================================================
   Form validation
   ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fieldError(form, field, message) {
    const slot = $('[data-error-for="' + field.id + '"]', form);
    if (slot) slot.textContent = message || '';
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
}

function validateForm(form) {
    let firstBad = null;

    $$('input, select, textarea', form).forEach(field => {
        if (!field.hasAttribute('required')) return;

        let message = '';
        const value = (field.value || '').trim();

        // A required tick-box carries its value whether or not it is ticked,
        // so it has to be checked for `checked`, not for a value.
        if (field.type === 'checkbox') {
            message = field.checked ? '' : 'Please tick this box to continue.';
        } else if (!value) {
            message = field.tagName === 'SELECT' ? 'Please choose an option.' : 'This field is required.';
        } else if (field.type === 'email' && !EMAIL_RE.test(value)) {
            message = 'Enter a valid email address, like name@example.com.';
        }

        fieldError(form, field, message);
        if (message && !firstBad) firstBad = field;
    });

    if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !firstBad;
}

/* A signature that isn't the person's own name isn't a signature. Compared
   loosely — case and extra spacing shouldn't trip anybody up. Used by both the
   membership application and the event registration. */
function signatureIsValid(form, signature, nameField) {
    if (!signature || !nameField) return true;

    const tidy = (value) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (tidy(signature.value) === tidy(nameField.value)) return true;

    fieldError(form, signature, 'Please type your name exactly as you entered it above.');
    signature.focus();
    signature.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return false;
}

function clearErrorOnInput(form) {
    form.addEventListener('input', (e) => {
        const field = e.target;
        if (field.matches('input, select, textarea') && field.getAttribute('aria-invalid') === 'true') {
            fieldError(form, field, '');
        }
    });
}

/* ==========================================================================
   Confirmation dialog

   Every form ends here on success. An inline line of green text under a long
   form is easy to miss — especially after scrolling — so a submission that
   worked says so unmistakably.

   Errors deliberately do NOT come through here. They stay inline next to the
   field, where the thing needing fixing is.

   Built in JavaScript rather than markup so it exists on every page without
   repeating it in seven files. Uses a native <dialog>, which brings the focus
   trap, Escape-to-close and the backdrop with it.
   ========================================================================== */
let confirmDialog = null;

function buildConfirmDialog() {
    const el = document.createElement('dialog');
    el.className = 'modal';
    el.setAttribute('aria-labelledby', 'modalTitle');
    el.innerHTML =
        '<div class="modal__inner">' +
        '<span class="modal__tick" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.6 4.6 4.5L19 7"/></svg>' +
        '</span>' +
        '<h2 class="modal__title" id="modalTitle"></h2>' +
        '<p class="modal__text"></p>' +
        '<dl class="modal__detail"></dl>' +
        '<button class="btn btn--primary btn--block" type="button" data-modal-close>Done</button>' +
        '</div>';

    $('[data-modal-close]', el).addEventListener('click', () => el.close());
    /* Clicking the backdrop closes it too. The backdrop is the dialog itself,
       so a click that lands on the panel inside must not count. */
    el.addEventListener('click', (event) => { if (event.target === el) el.close(); });

    document.body.appendChild(el);
    return el;
}

/* detail is an optional list of [label, value] pairs — the event and the total,
   the membership year and fee — so people can check what they just sent. */
function showConfirmation(title, message, detail) {
    if (!confirmDialog) confirmDialog = buildConfirmDialog();

    $('.modal__title', confirmDialog).textContent = title;
    $('.modal__text', confirmDialog).textContent = message;

    const list = $('.modal__detail', confirmDialog);
    list.innerHTML = (detail || [])
        .filter(row => row && row[1])
        .map(row => '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>')
        .join('');
    list.hidden = !list.children.length;

    /* Older browsers without showModal fall back to the inline status message,
       which every caller sets anyway. */
    if (typeof confirmDialog.showModal !== 'function') return false;
    confirmDialog.showModal();
    return true;
}

function formData(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
        // Tick-box groups (volunteering) send one entry per box ticked. Collect
        // them into a list instead of letting the last one overwrite the rest.
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            data[key] = [].concat(data[key], value);
        } else {
            data[key] = value;
        }
    });
    return data;
}

async function postJSON(url, payload) {
    /* Cross-origin posts go out as text/plain. It looks wrong — the body is
       JSON either way — but any other content type makes the browser send a
       CORS preflight, and a Google Apps Script web app cannot answer one. The
       request would fail before it ever reached the sheet. Our own /api routes
       are same-origin, so they keep the honest content type. */
    const sameOrigin = url.charAt(0) === '/';
    const headers = sameOrigin
        ? { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        : { 'Content-Type': 'text/plain;charset=utf-8' };

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Request failed with status ' + response.status);

    const result = await response.json().catch(() => ({}));
    /* Apps Script answers 200 even when it could not save the row, so the
       failure is in the body rather than the status code. */
    if (result && result.ok === false) throw new Error(result.error || 'The server rejected that.');
    return result;
}

const NOT_WIRED = 'This form isn\'t connected to an inbox yet. Add the endpoint in script.js → CONFIG.api.';

/* ==========================================================================
   Contact forms (home + about)
   ========================================================================== */
function initContactForms() {
    $$('#contactForm, #contactFormAbout').forEach(form => {
        const status = $('[data-status]', form);
        clearErrorOnInput(form);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!validateForm(form)) return;

            const submit = $('button[type="submit"]', form);
            const payload = Object.assign(formData(form), {
                type: 'contact',
                source: document.title,
                submittedAt: new Date().toISOString()
            });

            if (!CONFIG.api.contact) {
                console.info('[GCCA] Contact form payload:', payload);
                setStatus(status, NOT_WIRED + 'contact — your message was logged to the console instead.', 'notice');
                return;
            }

            submit && submit.setAttribute('disabled', 'true');
            setStatus(status, 'Sending your message…', 'working');

            try {
                await postJSON(CONFIG.api.contact, payload);
                form.reset();
                setStatus(status, 'Thanks — your message is on its way. Someone from the executive will reply soon.', 'success');
                showConfirmation('Message sent',
                    'Thanks for getting in touch. Someone from the executive will reply soon.',
                    [['Topic', payload.topic], ['We\'ll reply to', payload.email]]);
            } catch (error) {
                console.error(error);
                setStatus(status, 'That didn\'t go through. Please try again, or email gccacalgary@gmail.com directly.', 'error');
            } finally {
                submit && submit.removeAttribute('disabled');
            }
        });
    });
}

/* ==========================================================================
   Newsletter signups (every page)
   ========================================================================== */
function initNewsletter() {
    $$('[data-newsletter]').forEach(form => {
        const status = form.parentElement ? $('[data-status]', form.parentElement) : null;
        const input = $('input[type="email"]', form);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = (input.value || '').trim();

            if (!EMAIL_RE.test(email)) {
                setStatus(status, 'Enter a valid email address so we know where to send it.', 'error');
                input.focus();
                return;
            }

            if (!CONFIG.api.newsletter) {
                console.info('[GCCA] Newsletter signup:', email);
                setStatus(status, NOT_WIRED + 'newsletter.', 'notice');
                return;
            }

            const submit = $('button[type="submit"]', form);
            submit && submit.setAttribute('disabled', 'true');
            setStatus(status, 'Adding you to the list…', 'working');

            try {
                await postJSON(CONFIG.api.newsletter, {
                    type: 'newsletter', email, source: document.title
                });
                form.reset();
                setStatus(status, 'You\'re on the list. See you at the next celebration.', 'success');
                showConfirmation('You\'re on the list',
                    'We\'ll email you when there is something worth turning up for.',
                    [['Address', email]]);
            } catch (error) {
                console.error(error);
                setStatus(status, 'We couldn\'t add you just now. Please try again in a moment.', 'error');
            } finally {
                submit && submit.removeAttribute('disabled');
            }
        });
    });
}

/* ==========================================================================
   Checkout — only used once a payment processor is configured.
   Returns false when there is nothing to hand off to, so the caller can fall
   back to recording the registration and settling up offline.
   ========================================================================== */
/* Asks the server for a Square payment link. Returns { url, orderId, total,
   fee } or null if there is nothing to pay or checkout could not be started.

   It deliberately does NOT redirect. The caller records the submission first —
   otherwise a completed payment could leave no trace on this side, and the
   treasurer would see money arrive in Square with no idea who from. */
async function createCheckout(payload, status) {
    if (!CONFIG.api.checkout) return null;

    setStatus(status, 'Opening secure checkout…', 'working');
    try {
        const data = await postJSON(CONFIG.api.checkout, payload);
        if (data && data.url) return data;
        throw new Error('No checkout URL returned');
    } catch (error) {
        console.error(error);
        setStatus(status, 'Checkout couldn\'t start, so we\'ve saved your details instead — '
            + 'the executive will be in touch about paying.', 'notice');
        return null;
    }
}

/* ==========================================================================
   Membership applications
   ========================================================================== */
function initMembership() {
    const form = $('#membershipForm');
    if (!form) return;

    const category  = $('#memberCategory');
    const feeEl     = $('#memberFee');
    const feeLabel  = $('#memberFeeLabel');
    const btnLabel  = $('#memberBtnLabel');
    const submitBtn = $('#memberBtn');
    const status    = $('[data-status]', form);

    const nameField = $('#memberName');
    const signature = $('#memberSignature');

    const year = membershipYear();
    $$('[data-membership-year]').forEach(el => { el.textContent = year.label; });
    $$('[data-signature-date]', form).forEach(el => { el.textContent = longDay(new Date()); });

    clearErrorOnInput(form);

    function selectedFee() {
        const option = category.selectedOptions[0];
        return option && category.value ? Number(option.dataset.fee || 0) : null;
    }

    function render() {
        const fee = selectedFee();
        if (fee === null) {
            feeLabel.textContent = 'Yearly membership fee';
            feeEl.textContent = '—';
            btnLabel.textContent = 'Apply for membership';
            return;
        }
        feeLabel.textContent = 'Yearly membership fee';
        feeEl.textContent = money(fee);
        btnLabel.textContent = 'Apply — ' + money(fee) + ' a year';
    }

    category.addEventListener('change', () => { setStatus(status, ''); render(); });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(form)) return;

        if (!signatureIsValid(form, signature, nameField)) return;

        const option = category.selectedOptions[0];
        const payload = Object.assign(formData(form), {
            type: 'membership',
            categoryLabel: option ? option.textContent.trim() : '',
            fee: selectedFee(),
            signedAt: new Date().toISOString(),
            membershipYear: year.label,
            membershipYearStart: year.start,
            membershipYearEnd: year.end,
            currency: CONFIG.currency,
            submittedAt: new Date().toISOString()
        });

        if (!CONFIG.api.membership) {
            console.info('[GCCA] Membership application:', payload);
            setStatus(status, NOT_WIRED + 'membership — your application was logged to the console instead.', 'notice');
            return;
        }

        submitBtn && submitBtn.setAttribute('disabled', 'true');

        /* Same order as event registration: get the payment link, save the
           application with its Square reference, then send them off to pay.
           An abandoned payment still leaves the treasurer an application. */
        let checkout = null;
        if (selectedFee() > 0) {
            checkout = await createCheckout(payload, status);
            if (checkout) {
                payload.squareOrder = checkout.orderId || '';
                payload.processingFee = checkout.fee || 0;
                payload.totalCharged = checkout.total;
            }
        }

        setStatus(status, 'Sending your application…', 'working');

        try {
            await postJSON(CONFIG.api.membership, payload);

            if (checkout) {
                setStatus(status, 'Taking you to secure checkout…', 'working');
                window.location.assign(checkout.url);
                return;
            }

            form.reset();
            render();
            setStatus(status, 'Thank you — your application is in. The treasurer will confirm your membership and how to pay.', 'success');
            showConfirmation('Application received',
                'Welcome. The treasurer will confirm your membership and how to pay.',
                [['Category', payload.categoryLabel],
                 ['Membership year', year.label],
                 ['Fee', payload.fee ? money(payload.fee) : '']]);
        } catch (error) {
            console.error(error);
            setStatus(status, 'We couldn\'t send that. Please try again, or email gccacalgary@gmail.com.', 'error');
        } finally {
            submitBtn && submitBtn.removeAttribute('disabled');
        }
    });

    render();
}

/* ==========================================================================
   "Tell us how we are doing" — jumps to the contact form with the feedback
   topic pre-selected, or straight out to a survey if one is configured.
   ========================================================================== */
function initFeedbackButton() {
    const buttons = $$('[data-feedback-btn]');
    if (!buttons.length) return;

    const survey = (CONFIG.links && CONFIG.links.survey) || '';

    buttons.forEach(btn => {
        if (survey) {
            btn.href = survey;
            btn.target = '_blank';
            btn.rel = 'noopener';
            return;
        }

        btn.addEventListener('click', (event) => {
            const form = $('#contactForm') || $('#contactFormAbout');
            if (!form) return;
            event.preventDefault();

            const topic = $('select[name="topic"]', form);
            if (topic) {
                const match = $$('option', topic).find(o => /feedback/i.test(o.textContent));
                if (match) topic.value = match.value || match.textContent;
            }

            form.scrollIntoView({ block: 'center', behavior: 'smooth' });
            const message = $('textarea[name="message"]', form);
            window.setTimeout(() => message && message.focus({ preventScroll: true }), 450);
        });
    });
}

/* ==========================================================================
   The schedule — builds the upcoming list, the past archive, the home page
   preview and the registration dropdown from events-data.js
   ========================================================================== */
const esc = (value) => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function parseDay(iso) {
    const parts = String(iso || '').split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

function eventPricing(ev) {
    if (ev.adult === null || ev.adult === undefined) return 'tba';
    return Number(ev.adult) > 0 ? 'paid' : 'free';
}

// An event stays "upcoming" until the end of its last day.
// Meetings called as needed (onCall) never expire and never appear as past.
function hasPassed(ev) {
    if (ev.onCall) return false;
    const last = parseDay(ev.endsOn || ev.date);
    last.setHours(23, 59, 59, 999);
    return last < new Date();
}

function shortDate(ev) {
    if (ev.onCall) return 'date TBA';
    const date = parseDay(ev.date);
    const month = date.toLocaleDateString('en-CA', { month: 'short' });
    if (ev.dateTbd) return month + ' TBD';
    return month + ' ' + date.getDate() + (ev.tentative ? '?' : '');
}

function longDate(ev) {
    if (ev.onCall) return 'Called as required · date to be announced';
    const date = parseDay(ev.date);
    if (ev.dateTbd) {
        return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) + ' · date to be confirmed';
    }
    const full = date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    /* A date the executive has picked but not yet locked in. Different from
       dateTbd, where there is no day to show at all — here we show the day and
       say plainly that it could still move. */
    return full + (ev.tentative ? ' · tentative' : '');
}

const CTA_LABEL = { paid: 'Get tickets', free: 'Reserve a spot', tba: 'Register your interest' };

// Events restricted to members carry the note in their name, so it travels with
// the title everywhere it is shown — card, dropdown, and registration summary.
const eventTitle = (ev) => ev.title + (ev.membersOnly ? ' (Members only)' : '');

function eventTag(ev, past) {
    if (past) return '<span class="tag tag--muted">Held</span>';
    const pricing = eventPricing(ev);
    if (pricing === 'paid') return '<span class="tag">Tickets ' + money(ev.adult) + '</span>';
    if (pricing === 'free') return '<span class="tag tag--free">Free · RSVP</span>';
    return '<span class="tag tag--gold">Tickets · price to come</span>';
}

function eventCardHTML(ev, options) {
    const opts = options || {};
    const past = !!opts.past;
    const date = parseDay(ev.date);
    const where = [ev.venue, ev.address].filter(Boolean).join(', ');
    const when = past
        ? 'Held ' + longDate(ev)
        : longDate(ev) + (ev.time ? ' · ' + ev.time : '');

    const cta = past
        ? '<p class="event-card__past-note">Thanks to everyone who came out.</p>'
        : '<a class="link-arrow" href="' + esc(opts.href || '#register') + '" data-event-select="' + esc(ev.slug) + '">' +
        esc(CTA_LABEL[eventPricing(ev)]) +
        ' <svg width="17" height="17" aria-hidden="true"><use href="#i-arrow"/></svg></a>';

    return '' +
        /* Cards are built in JS, so they never picked up the data-delay that the
           hand-written markup uses. Without it a row of three fades in as one
           block. Cycling 0–2 across the row staggers them the way the rest of
           the site does. */
        '<article class="card event-card reveal' + (past ? ' event-card--past' : '') + '"' +
        ' data-delay="' + ((opts.index || 0) % 3) + '"' +
        (opts.hidden ? ' hidden' : '') + ' id="event-' + esc(ev.slug) + '">' +
        '<div class="event-card__media">' +
        '<span class="date-badge">' +
        '<span class="date-badge__month">' + esc(date.toLocaleDateString('en-CA', { month: 'short' })) + '</span>' +
        '<span class="date-badge__day' + (ev.dateTbd ? ' date-badge__day--tbd' : '') + '">' +
        (ev.dateTbd ? 'TBD' : date.getDate()) + '</span>' +
        '</span>' +
        (ev.image
            ? '<img src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" width="1200" height="800" loading="lazy">'
            : '') +
        '</div>' +
        '<div class="event-card__body">' +
        eventTag(ev, past) +
        '<h3 class="event-card__title" style="margin-top:.6rem">' + esc(eventTitle(ev)) + '</h3>' +
        '<p class="event-card__meta"><svg aria-hidden="true"><use href="#i-calendar"/></svg> ' + esc(when) + '</p>' +
        (where ? '<p class="event-card__meta"><svg aria-hidden="true"><use href="#i-pin"/></svg> ' + esc(where) + '</p>' : '') +
        '<p class="event-card__text">' + esc(ev.blurb) + '</p>' +
        cta +
        '</div>' +
        '</article>';
}

function populateEventSelect(upcoming) {
    const select = document.getElementById('eventChoice');
    if (!select) return;

    const options = upcoming.map(ev => {
        const pricing = eventPricing(ev);
        let suffix = '';
        if (pricing === 'free') {
            suffix = ev.meal > 0 ? ' (free, meal ' + money(ev.meal) + ')' : ' (free)';
        } else if (pricing === 'tba') {
            suffix = ' (price to come)';
        }
        return '<option value="' + esc(ev.slug) + '"' +
            ' data-pricing="' + pricing + '"' +
            ' data-adult="' + (Number(ev.adult) || 0) + '"' +
            ' data-youth="' + (Number(ev.youth) || 0) + '"' +
            ' data-meal="' + (Number(ev.meal) || 0) + '"' +
            ' data-tier="' + (ev.special ? 'special' : 'standard') + '"' +
            ' data-iso="' + esc(ev.date || '') + '"' +
            ' data-name="' + esc(eventTitle(ev)) + '"' +
            ' data-date="' + esc(shortDate(ev)) + '">' +
            esc(eventTitle(ev) + ' — ' + shortDate(ev) + suffix) + '</option>';
    }).join('');

    select.innerHTML = '<option value="">Choose an event</option>' + options;
}

function injectEventSchema(upcoming) {
    if (!upcoming.length) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: upcoming.map((ev, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
                '@type': 'Event',
                name: ev.title,
                startDate: ev.date,
                description: ev.blurb,
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: {
                    '@type': 'Place',
                    name: ev.venue || 'Calgary',
                    address: ev.address || 'Calgary, AB, Canada'
                },
                organizer: { '@type': 'Organization', name: 'GCCA Calgary' }
            }
        }))
    });
    document.head.appendChild(script);
}

function initEvents() {
    const all = Array.isArray(window.GCCA_EVENTS) ? window.GCCA_EVENTS.slice() : [];
    if (!all.length) return;

    const byDateAsc  = (a, b) => parseDay(a.date) - parseDay(b.date);
    const byDateDesc = (a, b) => parseDay(b.date) - parseDay(a.date);

    // Meetings called as needed sit outside the calendar — they are offered in
    // the registration dropdown but never take up a card on the schedule.
    const onCall    = all.filter(ev => ev.onCall);
    const scheduled = all.filter(ev => !ev.onCall);

    const upcoming = scheduled.filter(ev => !hasPassed(ev)).sort(byDateAsc);
    const past     = scheduled.filter(hasPassed).sort(byDateDesc);

    // Home page — the next three.
    const preview = document.getElementById('eventPreview');
    if (preview) {
        preview.innerHTML = upcoming.length
            ? upcoming.slice(0, 3).map((ev, index) =>
                eventCardHTML(ev, { index, href: 'events.html?event=' + encodeURIComponent(ev.slug) + '#register' })).join('')
            : '<p class="events-empty">Next season\'s schedule is on its way. Join the mailing list below to hear it first.</p>';
    }

    // Events page — everything.
    const list = document.getElementById('upcomingList');
    if (list) {
        list.innerHTML = upcoming.map((ev, index) => eventCardHTML(ev, { index, href: '#register' })).join('');

        const empty = document.getElementById('upcomingEmpty');
        if (empty) empty.hidden = upcoming.length > 0;

        const pastList = document.getElementById('pastList');
        const pastSection = document.getElementById('past');
        const toggle = document.getElementById('pastToggle');
        const VISIBLE = 3;

        if (pastList && pastSection && past.length) {
            pastSection.hidden = false;
            pastList.innerHTML = past.map((ev, index) =>
                eventCardHTML(ev, { index, past: true, hidden: index >= VISIBLE })).join('');

            if (toggle && past.length > VISIBLE) {
                toggle.hidden = false;
                toggle.textContent = 'Show all ' + past.length + ' past events';
                toggle.addEventListener('click', () => {
                    const hiddenCards = $$('#pastList .event-card[hidden]');
                    if (hiddenCards.length) {
                        hiddenCards.forEach(card => { card.hidden = false; card.classList.add('is-visible'); });
                        toggle.textContent = 'Show fewer';
                    } else {
                        $$('#pastList .event-card').forEach((card, index) => { card.hidden = index >= VISIBLE; });
                        toggle.textContent = 'Show all ' + past.length + ' past events';
                        pastSection.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    }
                });
            }
        }

        populateEventSelect(upcoming.concat(onCall));
        injectEventSchema(upcoming);
    }
}

/* ==========================================================================
   Event registration and ticketing
   ========================================================================== */

/* Meals at general meetings are charged for everyone sitting down to eat,
   children included. If the executive decides it should be one flat charge
   per household instead, change this to `() => 1` — nothing else moves. */
const mealCount = (adults, youth) => adults + youth;

/* Which cancellation terms apply, in the words of the policy page. Shown on the
   registration form so nobody agrees to a refund window they never saw. */
const REFUND_TERMS = {
    standard: 'Standard event: full refund if you cancel 7 or more days before, '
        + 'no refund within 48 hours of the event.',
    special: 'Special event: full refund 14 or more days before, 50% from 7 to 13 days, '
        + 'no refund within 7 days of the event.'
};

function initRegistration() {
    const form = $('#registrationForm');
    if (!form) return;

    const select    = $('#eventChoice');
    const adultQty  = $('#adultQty');
    const youthQty  = $('#youthQty');
    const orderEvent = $('#orderEvent');
    const totalEl   = $('#orderTotal');
    const totalLabel = $('#orderTotalLabel');
    const btnLabel  = $('#registerBtnLabel');
    const status    = $('[data-status]', form);
    const submitBtn = $('#registerBtn');

    const mealField = $('#mealField');
    const mealPriceEl = $('[data-meal-price]', form);
    const mealLineRow = $('[data-line-row="meal"]');
    const refundTerms = $('[data-refund-terms]');
    const nameField = $('#regName');
    const signature = $('#regSignature');

    // The signature is dated the day it is typed.
    $$('[data-signature-date]', form).forEach(el => { el.textContent = longDay(new Date()); });

    clearErrorOnInput(form);

    function clampQty(input) {
        const min = Number(input.min || 0);
        const max = Number(input.max || 20);
        let value = Math.round(Number(input.value) || 0);
        value = Math.min(max, Math.max(min, value));
        input.value = String(value);
        return value;
    }

    function currentOrder() {
        const option = select.selectedOptions[0];
        const pricing = option && select.value ? (option.dataset.pricing || 'free') : '';
        const adultPrice = option ? Number(option.dataset.adult || 0) : 0;
        const youthPrice = option ? Number(option.dataset.youth || 0) : 0;
        const mealPrice  = option ? Number(option.dataset.meal || 0) : 0;
        const tier = option && select.value ? (option.dataset.tier || 'standard') : '';
        const adults = clampQty(adultQty);
        const youth  = clampQty(youthQty);

        const mealChoice = $('input[name="meal"]:checked', form);
        const wantsMeal = mealPrice > 0 && !!mealChoice && mealChoice.value === 'yes';
        const meals = wantsMeal ? mealCount(adults, youth) : 0;

        return {
            slug: select.value,
            name: option ? (option.dataset.name || '') : '',
            date: option ? (option.dataset.date || '') : '',
            iso:  option ? (option.dataset.iso || '') : '',
            pricing, adults, youth, adultPrice, youthPrice, tier,
            mealPrice, wantsMeal, meals,
            total: adults * adultPrice + youth * youthPrice + meals * mealPrice
        };
    }

    function render() {
        const order = currentOrder();
        const lineAdults = $('[data-line="adults"]');
        const lineYouth  = $('[data-line="youth"]');
        const lineMeal   = $('[data-line="meal"]');

        // The meal choice only belongs on screen for events that offer one.
        if (mealField) {
            mealField.hidden = !(order.mealPrice > 0);
            if (mealField.hidden) {
                const off = $('input[name="meal"][value="no"]', form);
                if (off) off.checked = true;
            } else if (mealPriceEl) {
                mealPriceEl.textContent = money(order.mealPrice);
            }
        }
        // Which refund window this booking falls under.
        if (refundTerms) {
            refundTerms.textContent = REFUND_TERMS[order.tier] || '';
            refundTerms.hidden = !order.tier;
        }

        if (mealLineRow) mealLineRow.hidden = !order.wantsMeal;
        if (lineMeal && order.wantsMeal) {
            lineMeal.textContent = order.meals + ' × ' + money(order.mealPrice)
                + ' = ' + money(order.meals * order.mealPrice);
        }

        if (!order.slug) {
            orderEvent.textContent = 'No event selected yet.';
            lineAdults.textContent = '—';
            lineYouth.textContent = '—';
            totalLabel.textContent = 'Total';
            totalEl.textContent = money(0);
            btnLabel.textContent = 'Complete registration';
            return;
        }

        orderEvent.textContent = order.name + (order.date ? ' · ' + order.date : '');

        const priced = order.pricing === 'paid';
        lineAdults.textContent = priced
            ? order.adults + ' × ' + money(order.adultPrice) + ' = ' + money(order.adults * order.adultPrice)
            : order.adults + ' attending';

        lineYouth.textContent = priced
            ? order.youth + ' × ' + money(order.youthPrice) + ' = ' + money(order.youth * order.youthPrice)
            : order.youth + ' attending';

        // A free meeting stops being free once meals are added to it.
        if (order.pricing === 'free' && order.total === 0) {
            totalLabel.textContent = 'This event is free';
            totalEl.textContent = 'Free';
            btnLabel.textContent = 'Confirm your RSVP';
        } else if (order.pricing === 'tba') {
            totalLabel.textContent = 'Ticket price';
            totalEl.textContent = 'To come';
            btnLabel.textContent = 'Register your interest';
        } else {
            totalLabel.textContent = 'Total (' + CONFIG.currency + ')';
            totalEl.textContent = money(order.total);
            btnLabel.textContent = order.total > 0 ? 'Pay ' + money(order.total) : 'Add at least one ticket';
        }
    }

    select.addEventListener('change', () => { setStatus(status, ''); render(); });
    [adultQty, youthQty].forEach(input => input.addEventListener('input', render));
    $$('input[name="meal"]', form).forEach(input => input.addEventListener('change', render));

    $$('.qty button').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            input.value = String(Number(input.value || 0) + Number(btn.dataset.step));
            clampQty(input);
            render();
        });
    });

    // Pre-select an event from ?event=slug or from a card link
    const requested = new URLSearchParams(window.location.search).get('event');
    if (requested && $$('option', select).some(o => o.value === requested)) {
        select.value = requested;
    }

    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-event-select]');
        if (!link) return;
        select.value = link.dataset.eventSelect;
        setStatus(status, '');
        render();
        window.setTimeout(() => select.focus({ preventScroll: true }), 400);
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(form)) return;

        const order = currentOrder();
        if (order.adults + order.youth < 1) {
            setStatus(status, 'Add at least one ticket before registering.', 'error');
            return;
        }

        if (!signatureIsValid(form, signature, nameField)) return;

        const payload = Object.assign(formData(form), {
            type: 'registration',
            eventSlug: order.slug,
            eventName: order.name,
            eventDate: order.date,
            eventDateISO: order.iso,
            adults: order.adults,
            youth: order.youth,
            meals: order.meals,
            mealPrice: order.mealPrice,
            mealTotal: order.meals * order.mealPrice,
            refundTier: order.tier,
            total: order.total,
            signedAt: new Date().toISOString(),
            currency: CONFIG.currency,
            paymentLink: CONFIG.payments.paymentLinks[order.slug] || '',
            successUrl: window.location.origin + window.location.pathname + '?registration=success',
            cancelUrl:  window.location.origin + window.location.pathname + '?registration=cancelled#register'
        });

        /* Anything with money on it — tickets, or a free meeting with meals
           added — gets a Square payment link. The link is fetched BEFORE the
           registration is saved so the Square order reference can be saved
           with it, and the registration is saved BEFORE anyone is sent off to
           pay. Do it the other way round and a completed payment can leave no
           record on this side at all. */
        let checkout = null;
        if (order.total > 0) {
            submitBtn && submitBtn.setAttribute('disabled', 'true');
            checkout = await createCheckout(payload, status);
            submitBtn && submitBtn.removeAttribute('disabled');
            if (checkout) {
                payload.squareOrder = checkout.orderId || '';
                payload.processingFee = checkout.fee || 0;
                payload.total = checkout.total;      // what they actually pay, fee included
            }
        }

        // Free event, price not announced, or paid-but-offline → record the RSVP.
        if (!CONFIG.api.registration) {
            console.info('[GCCA] Registration payload:', payload);
            setStatus(status, NOT_WIRED + 'registration — your RSVP was logged to the console instead.', 'notice');
            return;
        }

        submitBtn && submitBtn.setAttribute('disabled', 'true');
        setStatus(status, 'Saving your spot…', 'working');

        try {
            await postJSON(CONFIG.api.registration, payload);

            /* Saved. Now — and only now — hand them to Square to pay. */
            if (checkout) {
                setStatus(status, 'Taking you to secure checkout…', 'working');
                window.location.assign(checkout.url);
                return;
            }

            form.reset();
            render();
            let message = 'You\'re registered. Check your email for confirmation — see you there.';
            let title = 'You\'re registered';
            if (order.pricing === 'tba') {
                title = 'Interest registered';
                message = 'We\'ll email you as soon as tickets go on sale.';
            } else if (order.total > 0) {
                title = 'Registration received';
                message = 'The executive will be in touch to confirm your spot and how to pay '
                    + money(order.total) + '.';
            }
            setStatus(status, message, 'success');
            showConfirmation(title, message, [
                ['Event', order.name],
                ['Date', order.date],
                ['Attending', order.adults + ' adult' + (order.adults === 1 ? '' : 's')
                    + (order.youth ? ', ' + order.youth + ' child' + (order.youth === 1 ? '' : 'ren') : '')],
                ['Meals', order.meals ? String(order.meals) : ''],
                ['Total', order.total > 0 ? money(order.total) : 'Free']
            ]);
        } catch (error) {
            console.error(error);
            setStatus(status, 'We couldn\'t save that. Please try again, or email gccacalgary@gmail.com.', 'error');
        } finally {
            submitBtn && submitBtn.removeAttribute('disabled');
        }
    });

    render();
}

/* ==========================================================================
   Messages after returning from a hosted checkout
   ========================================================================== */
function initReturnMessages() {
    const params = new URLSearchParams(window.location.search);

    const cases = [
        { key: 'registration', target: '#registrationForm [data-status]',
            title: 'Payment received',
            success: 'You\'re registered and paid. Square has emailed your receipt.',
            cancelled: 'Checkout was cancelled and nothing was charged. Your registration is saved, so the executive can still take payment another way.' },
        { key: 'membership', target: '#membershipForm [data-status]',
            title: 'Membership paid',
            success: 'Your membership is paid. Square has emailed your receipt, and the treasurer will confirm shortly.',
            cancelled: 'Checkout was cancelled and nothing was charged. Your application is saved, so the treasurer can still take payment another way.' }
    ];

    cases.forEach(item => {
        const value = params.get(item.key);
        if (!value) return;
        const el = $(item.target);
        if (!el) return;

        setStatus(el, value === 'success' ? item.success : item.cancelled,
            value === 'success' ? 'success' : 'notice');
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });

        /* Coming back from a payment page, a popup is the clearest possible
           signal that the money went through. A cancellation stays inline —
           it is not something to celebrate with a dialog. */
        if (value === 'success') {
            showConfirmation(item.title, item.success);
        }
    });
}

/* ==========================================================================
   Culture page tabs
   ========================================================================== */
function initTabs() {
    $$('[data-tabs]').forEach(group => {
        const tabs = $$('[role="tab"]', group);
        if (!tabs.length) return;

        function activate(tab, setFocus = true) {
            tabs.forEach(item => {
                const selected = item === tab;
                item.setAttribute('aria-selected', String(selected));
                item.tabIndex = selected ? 0 : -1;
                const panel = document.getElementById(item.getAttribute('aria-controls'));
                if (panel) panel.hidden = !selected;
            });
            if (setFocus) tab.focus();
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => activate(tab, false));
            tab.addEventListener('keydown', (event) => {
                const index = tabs.indexOf(tab);
                let next = null;

                if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
                else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
                else if (event.key === 'Home') next = tabs[0];
                else if (event.key === 'End') next = tabs[tabs.length - 1];

                if (next) {
                    event.preventDefault();
                    activate(next);
                }
            });
        });

        // Deep links: culture.html#music opens the matching tab.
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const match = tabs.find(tab => tab.id === 'tab-' + hash);
            if (match) activate(match, false);
        }

        // Tiles at the top of the page link to #food, #music, and so on.
        $$('a[href^="#"]').forEach(link => {
            const target = link.getAttribute('href').slice(1);
            const match = tabs.find(tab => tab.id === 'tab-' + target);
            if (!match) return;
            link.addEventListener('click', () => activate(match, false));
        });
    });
}

/* ==========================================================================
   From Guyana to Calgary

   Runs the route once, the first time the row comes into view. All of the
   timing lives in the stylesheet; this only decides when to start it.

   `is-armed` is added straight away and is the only thing that hides the
   stops. If this file never loads, or throws before this point, the row is
   simply there — never blank.
   ========================================================================== */
function initJourney() {
    const row = $('.journey');
    if (!row) return;

    row.classList.add('is-armed');

    if (!('IntersectionObserver' in window)) {
        row.classList.add('is-running');
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            entry.target.classList.add('is-running');
        });
    }, { threshold: 0.35 });

    observer.observe(row);
}

/* ==========================================================================
   Photo strip

   The seamless loop needs the photos present twice, so the second set slides
   into place exactly as the first leaves. Doing that here rather than in the
   markup means the page carries one copy of the list: editing the strip is
   editing eight lines, not sixteen kept in sync by hand.

   The clones are hidden from assistive technology — a screen reader should
   hear each photo once, not twice.
   ========================================================================== */
function initPhotoStrip() {
    document.querySelectorAll('[data-strip]').forEach(strip => {
        const track = strip.querySelector('.strip__track');
        if (!track) return;

        const items = Array.from(track.children);
        if (!items.length) return;

        /* Speed follows the number of photos, so the band moves at the same
           pace whatever it holds. */
        track.style.setProperty('--strip-count', String(items.length));

        items.forEach(item => {
            const copy = item.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            track.appendChild(copy);
        });
    });
}

/* ==========================================================================
   Scroll-driven motion — parallax banners and reading progress

   Both hang off one scroll listener and one requestAnimationFrame, rather than
   each adding their own. Scroll handlers that write to the DOM directly are
   the classic way to make a page feel worse than no animation at all.

   Anyone who has asked for reduced motion gets neither.
   ========================================================================== */
function initScrollMotion() {
    const root = document.documentElement;
    root.setAttribute('data-motion', 'starting');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.setAttribute('data-motion', 'reduced');
        return;
    }

    const banners = Array.from(document.querySelectorAll('.banner__bg'));

    /* Only long pages earn a progress bar. On a short page it would sit at
       full width the moment you arrived, which says nothing. */
    let bar = null;
    if (root.scrollHeight > window.innerHeight * 2.5
        && document.querySelector('.doc-body, .policy')) {
        bar = document.createElement('div');
        bar.className = 'read-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
    }

    if (!banners.length && !bar) {
        root.setAttribute('data-motion', 'nothing-to-move');
        return;
    }

    let ticking = false;

    const paint = () => {
        ticking = false;

        if (bar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const through = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            bar.style.transform = 'scaleX(' + through.toFixed(4) + ')';
        }

        banners.forEach(bg => {
            const box = bg.getBoundingClientRect();
            if (box.bottom < 0 || box.top > window.innerHeight) return;   // off screen

            /* How far the banner has travelled through the viewport, -1 to 1.
               The image shifts a fraction of that, so it lags the page. */
            const progress = (box.top + box.height / 2 - window.innerHeight / 2)
                / (window.innerHeight / 2 + box.height / 2);
            const img = bg.firstElementChild;
            if (img) img.style.transform = 'translate3d(0,' + (progress * 9).toFixed(2) + '%,0)';
        });
    };

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(paint);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    paint();
    root.setAttribute('data-motion', 'on:' + banners.length + (bar ? '+bar' : ''));
}

/* ==========================================================================
   Landing on a #section from another page

   The browser jumps to the anchor as soon as the HTML is parsed — before the
   photos above it have loaded and claimed their space. Those images then push
   the target hundreds of pixels further down, leaving the visitor stranded
   near the top of a page they were sent into the middle of.

   So once everything has loaded, aim again. If the visitor has already started
   scrolling themselves, leave them alone — yanking the page out from under
   someone is worse than landing in the wrong place.
   ========================================================================== */
function initHashLanding() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    const target = document.getElementById(id);
    if (!target) return;

    let userMoved = false;
    const noteUserMoved = () => { userMoved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(type =>
        window.addEventListener(type, noteUserMoved, { passive: true, once: true }));

    const settle = () => {
        window.setTimeout(() => {
            if (userMoved) return;
            /* Only correct a genuine miss. The offset allows for the sticky
               header, which scroll-padding-top already accounts for. */
            const off = target.getBoundingClientRect().top;
            /* Instant, not smooth. This is correcting a landing the visitor
               already asked for — animating them down from the top would be
               slower, and the stylesheet's smooth scrolling is also throttled
               in background tabs, which would leave the fix silently doing
               nothing. */
            if (Math.abs(off) > 140) target.scrollIntoView({ block: 'start', behavior: 'instant' });
        }, 140);
    };

    if (document.readyState === 'complete') settle();
    else window.addEventListener('load', settle, { once: true });
}

/* ==========================================================================
   News from Guyana

   Headlines come from /api/news, which reads three Guyanese feeds server-side
   — the browser cannot fetch them directly, they send no CORS headers.

   The section is marked hidden in the markup and only revealed once headlines
   actually arrive. If the outlets are down, or the site is on hosting without
   serverless functions, visitors simply never see it rather than being shown
   an empty panel or an error about somebody else's server.
   ========================================================================== */
function relativeDay(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    if (isNaN(then)) return '';

    const hours = (Date.now() - then.getTime()) / 36e5;
    if (hours < 1) return 'Just now';
    if (hours < 24) return Math.round(hours) + ' hour' + (Math.round(hours) === 1 ? '' : 's') + ' ago';
    const days = Math.round(hours / 24);
    if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
    return then.toLocaleDateString('en-CA', { day: 'numeric', month: 'long' });
}

async function initNews() {
    const section = $('[data-news]');
    const list = $('#newsList');
    if (!section || !list) return;

    let data;
    try {
        const response = await fetch('/api/news', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        data = await response.json();
    } catch (error) {
        console.info('[GCCA] News unavailable, section left hidden:', error.message);
        return;
    }

    const items = (data && data.items) || [];
    if (!items.length) return;

    /* Headline, one line, link out — never the article itself. Every link
       leaves the site, so it opens in a new tab and says where it is going. */
    list.innerHTML = items.map((item, index) =>
        '<article class="news-card reveal" data-delay="' + (index % 3) + '">' +
        '<span class="news-card__source">' + esc(item.source) + '</span>' +
        '<h3 class="news-card__title">' +
        '<a href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer">' +
        esc(item.title) + '</a></h3>' +
        (item.snippet ? '<p class="news-card__text">' + esc(item.snippet) + '</p>' : '') +
        '<span class="news-card__time">' + esc(relativeDay(item.published)) + '</span>' +
        '</article>'
    ).join('');

    const note = $('[data-news-sources]');
    if (note && data.sources) {
        note.textContent = 'Headlines from ' + data.sources.join(', ')
            + '. GCCA Calgary is not affiliated with any of them, and links open on their own sites.';
    }

    section.hidden = false;
    observeReveals(list);      // these arrived after initReveal ran
}

/* ==========================================================================
   A long document's table of contents. It is a sidebar on desktop and stays
   open; on a phone the same list is most of a screen to scroll past, so it
   starts collapsed. Done here rather than in CSS because a <details> cannot be
   closed by a stylesheet — only the `open` attribute decides.
   ========================================================================== */
function initDocContents() {
    $$('[data-toc]').forEach(toc => {
        if (window.matchMedia('(max-width: 900px)').matches) {
            toc.removeAttribute('open');
        }
    });
}

/* ==========================================================================
   "Download as PDF" on long documents — the browser's own print dialog, where
   "Save as PDF" is a destination. No file to keep in sync, and it picks up the
   print styles in the stylesheet.
   ========================================================================== */
function initPrintButtons() {
    const buttons = $$('[data-print]');
    if (!buttons.length) return;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => window.print());
    });

    // Arriving from a "Download as PDF" link elsewhere on the site — open the
    // dialog straight away, once the fonts and layout have settled.
    if (new URLSearchParams(window.location.search).get('print') === '1') {
        window.setTimeout(() => window.print(), 700);
    }
}

/* ==========================================================================
   Boot
   ========================================================================== */
function init() {
    initChrome();
    initEvents();
    initReveal();
    initImageFallbacks();
    initContactForms();
    initNewsletter();
    initMembership();
    initFeedbackButton();
    initRegistration();
    initTabs();
    initReturnMessages();
    initDocContents();
    initPrintButtons();
    initNews();
    initJourney();
    initPhotoStrip();
    initScrollMotion();
    initHashLanding();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}