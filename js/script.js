/* ==========================================================================
   GCCA Calgary — script.js
   --------------------------------------------------------------------------
   Everything the site needs, in one file. Start by filling in CONFIG below.
   ========================================================================== */

const CONFIG = {
    /* ---------------------------------------------------------------------
       1. Where forms post to. Leave a value empty and that form will tell you
          it isn't connected yet instead of silently swallowing submissions.

          Options for each: your own endpoint (e.g. "/api/contact" on Vercel),
          a Formspree URL, or a Google Apps Script web app URL.
       --------------------------------------------------------------------- */
    api: {
        contact:      '',   // e.g. '/api/contact'
        newsletter:   '',   // e.g. '/api/newsletter'  (Mailchimp proxy)
        registration: '',   // e.g. '/api/register'    (event RSVPs land here)
        membership:   '',   // e.g. '/api/membership'  (membership applications)
        checkout:     ''    // e.g. '/api/create-checkout-session'
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

    const closeNav = () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
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
function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach(el => observer.observe(el));
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

function clearErrorOnInput(form) {
    form.addEventListener('input', (e) => {
        const field = e.target;
        if (field.matches('input, select, textarea') && field.getAttribute('aria-invalid') === 'true') {
            fieldError(form, field, '');
        }
    });
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
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Request failed with status ' + response.status);
    return response.json().catch(() => ({}));
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
                await postJSON(CONFIG.api.newsletter, { email, source: document.title });
                form.reset();
                setStatus(status, 'You\'re on the list. See you at the next celebration.', 'success');
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
async function startCheckout(payload, status) {
    // Path A — your own Checkout Session endpoint.
    if (CONFIG.api.checkout) {
        setStatus(status, 'Opening secure checkout…', 'working');
        try {
            const data = await postJSON(CONFIG.api.checkout, payload);
            if (data && data.url) {
                window.location.assign(data.url);
                return true;
            }
            throw new Error('No checkout URL returned');
        } catch (error) {
            console.error(error);
            setStatus(status, 'Checkout couldn\'t start. Please try again, or email gccacalgary@gmail.com.', 'error');
            return false;
        }
    }

    // Path B — a hosted payment link for this event.
    const link = payload.paymentLink;
    if (link) {
        setStatus(status, 'Opening secure checkout…', 'working');
        window.location.assign(link);
        return true;
    }

    // No processor configured — the caller records the registration instead.
    return false;
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

    const year = membershipYear();
    $$('[data-membership-year]').forEach(el => { el.textContent = year.label; });

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

        const option = category.selectedOptions[0];
        const payload = Object.assign(formData(form), {
            type: 'membership',
            categoryLabel: option ? option.textContent.trim() : '',
            fee: selectedFee(),
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
        setStatus(status, 'Sending your application…', 'working');

        try {
            await postJSON(CONFIG.api.membership, payload);
            form.reset();
            render();
            setStatus(status, 'Thank you — your application is in. The treasurer will confirm your membership and how to pay.', 'success');
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
    return ev.dateTbd ? month + ' TBD' : month + ' ' + date.getDate();
}

function longDate(ev) {
    if (ev.onCall) return 'Called as required · date to be announced';
    const date = parseDay(ev.date);
    if (ev.dateTbd) {
        return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' }) + ' · date to be confirmed';
    }
    return date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
        '<article class="card event-card reveal' + (past ? ' event-card--past' : '') + '"' +
        (opts.hidden ? ' hidden' : '') + ' id="event-' + esc(ev.slug) + '">' +
        '<div class="event-card__media">' +
        '<span class="date-badge">' +
        '<span class="date-badge__month">' + esc(date.toLocaleDateString('en-CA', { month: 'short' })) + '</span>' +
        '<span class="date-badge__day' + (ev.dateTbd ? ' date-badge__day--tbd' : '') + '">' +
        (ev.dateTbd ? 'TBD' : date.getDate()) + '</span>' +
        '</span>' +
        (ev.image
            ? '<img src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" width="600" height="600" loading="lazy">'
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
            ? upcoming.slice(0, 3).map(ev =>
                eventCardHTML(ev, { href: 'events.html?event=' + encodeURIComponent(ev.slug) + '#register' })).join('')
            : '<p class="events-empty">Next season\'s schedule is on its way. Join the mailing list below to hear it first.</p>';
    }

    // Events page — everything.
    const list = document.getElementById('upcomingList');
    if (list) {
        list.innerHTML = upcoming.map(ev => eventCardHTML(ev, { href: '#register' })).join('');

        const empty = document.getElementById('upcomingEmpty');
        if (empty) empty.hidden = upcoming.length > 0;

        const pastList = document.getElementById('pastList');
        const pastSection = document.getElementById('past');
        const toggle = document.getElementById('pastToggle');
        const VISIBLE = 3;

        if (pastList && pastSection && past.length) {
            pastSection.hidden = false;
            pastList.innerHTML = past.map((ev, index) =>
                eventCardHTML(ev, { past: true, hidden: index >= VISIBLE })).join('');

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
        const adults = clampQty(adultQty);
        const youth  = clampQty(youthQty);

        const mealChoice = $('input[name="meal"]:checked', form);
        const wantsMeal = mealPrice > 0 && !!mealChoice && mealChoice.value === 'yes';
        const meals = wantsMeal ? mealCount(adults, youth) : 0;

        return {
            slug: select.value,
            name: option ? (option.dataset.name || '') : '',
            date: option ? (option.dataset.date || '') : '',
            pricing, adults, youth, adultPrice, youthPrice,
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

        // A signature that isn't the registrant's name isn't a signature. Names
        // are compared loosely — case and spacing shouldn't trip anyone up.
        const tidy = (value) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (signature && nameField && tidy(signature.value) !== tidy(nameField.value)) {
            fieldError(form, signature, 'Please type your name exactly as you entered it above.');
            signature.focus();
            signature.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
        }

        const payload = Object.assign(formData(form), {
            type: 'registration',
            eventSlug: order.slug,
            eventName: order.name,
            adults: order.adults,
            youth: order.youth,
            meals: order.meals,
            mealPrice: order.mealPrice,
            mealTotal: order.meals * order.mealPrice,
            total: order.total,
            signedAt: new Date().toISOString(),
            currency: CONFIG.currency,
            paymentLink: CONFIG.payments.paymentLinks[order.slug] || '',
            successUrl: window.location.origin + window.location.pathname + '?registration=success',
            cancelUrl:  window.location.origin + window.location.pathname + '?registration=cancelled#register'
        });

        // Anything with money on it — tickets, or a free meeting with meals
        // added — hands off to the payment processor, if one is set up.
        if (order.total > 0) {
            submitBtn && submitBtn.setAttribute('disabled', 'true');
            const started = await startCheckout(payload, status);
            submitBtn && submitBtn.removeAttribute('disabled');
            if (started) return;
            // Nothing configured yet — fall through and record the registration
            // so the executive can follow up about payment.
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
            form.reset();
            render();
            let message = 'You\'re registered. Check your email for confirmation — see you there.';
            if (order.pricing === 'tba') {
                message = 'Noted — we\'ll email you as soon as tickets go on sale.';
            } else if (order.total > 0) {
                message = 'You\'re registered. The executive will be in touch to confirm your spot and how to pay '
                    + money(order.total) + '.';
            }
            setStatus(status, message, 'success');
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
            success: 'You\'re registered and paid. Confirmation and tickets are in your email.',
            cancelled: 'Checkout was cancelled and nothing was charged. Your details are still filled in.' }
    ];

    cases.forEach(item => {
        const value = params.get(item.key);
        if (!value) return;
        const el = $(item.target);
        if (!el) return;

        setStatus(el, value === 'success' ? item.success : item.cancelled,
            value === 'success' ? 'success' : 'notice');
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}