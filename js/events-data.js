/* ==========================================================================
   GCCA Calgary — the season's schedule
   --------------------------------------------------------------------------
   THIS IS THE ONLY FILE TO EDIT WHEN THE CALENDAR CHANGES.

   The Events page and the Home page preview are both built from this list,
   and events move themselves into "Past events" the day after they happen —
   nothing to remember, nothing to delete.

   Each entry:
     slug        Used in links (?event=slug) and in api/create-checkout-session.js.
                 Keep them matching.
     image       Photo for the card, in /assets. Until the file exists the card
                 shows a labelled placeholder naming the file to drop in.
                 Save them LANDSCAPE at 3:2 — 1200x800 is what the card
                 declares, and the slot across the top of the card crops to
                 3:2, so anything else loses its top and bottom.
     date        'YYYY-MM-DD'. Used for ordering and for the date badge.
     dateTbd     true when the day isn't confirmed — the badge shows "TBD"
                 and the event stays listed for the whole month.
     tentative   true when a specific day has been chosen but not locked in.
                 The date is shown in full and marked "· tentative". Use this
                 rather than dateTbd when there IS a date to tell people about.
                 Remove the flag once the date is confirmed.
     endsOn      Last day it counts as upcoming. Defaults to `date`.
     onCall      true for meetings that are called as needed rather than
                 scheduled (e.g. a Special General Meeting). These stay off
                 the calendar but remain selectable in the registration form.
     membersOnly true when the event is open to members only. The title then
                 reads "… (Members only)" on the card and in the dropdown.
     meal        Price of the optional meal at a meeting, in CAD. The form then
                 offers "Meeting only (free)" or "Meeting with meal ($5)".
                 Leave it off for events where a meal isn't offered separately.
     mealFreeUnder
                 Age below which the meal is not charged for. `6` means kids 5
                 and under eat free. The form grows a third quantity box for
                 them, so the association still gets a head count to cater for
                 — they are counted, just not charged. Set `ages.youth` to
                 match on the same event, or the Children box will still claim
                 to start at 2 when it now starts at the age given here.
     special     true for galas, tournaments, catered and ticketed events —
                 the ones with pre-paid vendors and fixed costs. These get the
                 longer refund windows (14 / 7 days) from the cancellation
                 policy. Leave it off and the event is treated as standard
                 (7 days / 48 hours). See policy.html.
     adult/youth Ticket price in CAD:
                   null → price not announced yet (people register interest)
                   0    → free, RSVP only
                   25   → $25 a ticket
                 `youth` is the child rate (2–17). Under 2 always free.
     flyers      Optional. Poster images for the event, shown as a row of small
                 portrait thumbnails on the card; clicking one opens the flyer
                 viewer. Each entry is { src, alt }. Save them PORTRAIT — the
                 thumbnail shows the whole flyer uncropped, so nothing is lost
                 off the top or bottom the way the 3:2 `image` above would cut
                 it. A flyer whose file is missing drops out of the row quietly
                 rather than leaving a broken image on the page.
                 `alt` matters: it is what a screen reader announces and all
                 Google can read, so describe the flyer, and keep the date,
                 time, venue and price in the fields above as well — never let
                 the flyer be the only place a detail appears.
     ages        Only for events whose age bands differ from that standard.
                 { adult: '19+', youth: '6–18, 5 and under free' } rewrites the
                 two hints on the registration form while that event is chosen,
                 and the child line on the receipt. Every other event keeps the
                 standard wording. Keep it matching the `youthLabel` for the
                 same slug in api/create-checkout-session.js.
   ========================================================================== */

window.GCCA_EVENTS = [
    {
        slug: 'stampede-golf-bbq',
        title: 'Stampede Golf & BBQ',
        venue: 'Golf Fanatics',
        address: '7100 15 St SE, Calgary, AB T2H 2Z8',
        time: 'Tee time 10:00am · Lunch 12:00pm',
        /* Next one is tentatively Saturday 24 July 2027. When it is confirmed,
           change the date below to '2027-07-24' and the event moves from the
           past archive back onto the schedule. Add `tentative: true` alongside
           it if the day still is not locked in. */
        date: '2026-07-18',
        blurb: 'Fire up your swing and your appetite. Golf and BBQ lunch is the perfect combo.',
        image: 'assets/event-golf-bbq.jpg',
        adult: null,
        youth: null
    },
    {
        slug: 'carifest',
        title: 'Carifest',
        venue: 'Cowboys Park',
        address: '1220 9 Ave SW, Calgary, AB T3C 0J2',
        time: 'Parade 12:30pm – 2:30pm',
        date: '2026-08-15',
        blurb: 'Join the GCCA parade for an afternoon of Caribbean rhythm and food. Prices are for a parade costume.',
        image: 'assets/event-carifest.jpg',
        adult: 50,
        youth: 30,
        special: true
    },
    {
        slug: 'caribbean-sports-day',
        title: 'Caribbean Sports Day',
        venue: 'Rotary Challenger Park',
        address: '3688 48 Ave NE, Calgary, AB T3J 5C8',
        time: '9:00am – 5:00pm',
        date: '2026-09-12',
        blurb: 'Participate in one or more of the sports: football, basketball, cricket, dominoes, track & field.',
        image: 'assets/event-sports-day.jpg',
        flyers: [
            { src: 'assets/eventflyers/SportsDay.jpeg', alt: 'Caribbean Heritage Sports Competition flyer — 10th anniversary, Saturday 12 September, Calgary Rotary Challenger Park, 3688 48 Ave NE. Soccer, basketball, volleyball, netball, cricket, tennis clinic, pickleball, track & field and lime & spoon. Opening ceremony 1pm, free tennis clinic for under-15s, games, food and a live DJ.' },
            /* The symposium the evening before, carried on this card. It runs on
               its own date at its own venue, so the alt text leads with both —
               the card's badge and address are the Saturday's, not this one's.
               The space in the file name is encoded; leaving it raw works in
               most browsers but not in every share preview or feed reader. */
            { src: 'assets/eventflyers/Bruny%20Surin.jpeg', alt: 'Sports Day Symposium flyer — an evening with Bruny Surin, Olympic champion and keynote speaker, on the Friday before Sports Day: 11 September, 7:00pm to 9:00pm at the Marriott Hotel, 2530 48th Ave NE, Calgary. Free, all ages welcome.' }
        ],
        adult: 0,
        youth: 0
    },
    {
        slug: 'rgm-september',
        title: "Members' Regular General Meeting & Games Night",
        venue: 'SVG Hall',
        address: '2110 41 Ave NE, Calgary, AB T2E 8Z7',
        time: 'Meeting 2:00pm · Games night 4:00pm',
        date: '2026-09-20',
        blurb: 'Your voice shapes the future. Show up and be part of the decision making, then stay for games night.',
        image: 'assets/event-general-meeting.jpg',
        adult: 0,
        youth: 0,
        meal: 5,
        mealFreeUnder: 6,
        ages: { youth: '6–17' }
    },
    {
        slug: 'taste-of-guyana',
        title: 'Taste of Guyana',
        venue: 'Portuguese Community Centre, Our Lady of Fatima Parish Hall',
        address: '4747 30th St SE, Calgary',
        /* Both sittings, from the 2026 flyer. */
        time: 'Dinner & bake sale 4:00pm – 7:30pm · Dance 7:30pm – 11:00pm',
        date: '2026-10-10',
        blurb: 'Treat your buds to a taste of Guyanese cuisine.',
        image: 'assets/event-taste-of-guyana.jpg',
        flyers: [
            { src: 'assets/eventflyers/TOG_2026-flyer.png', alt: 'The Taste of Guyana flyer — 10 October 2026 at Our Lady of Fatima Hall, 4747 30th Street SE. Adults $25, kids 6 to 18 $20, kids 5 and under free. Dinner and bake sale 4:00 to 7:30pm, dance 7:30 to 11:00pm.' }
        ],
        adult: 25,
        youth: 20,
        ages: { adult: '19+', youth: '6–18, 5 and under free' },
        special: true
    },
    {
        slug: 'family-christmas-party',
        title: 'Family Christmas Party',
        venue: 'SVG Hall',
        address: '2110 41 Ave NE, Calgary, AB T2E 8Z7',
        time: '2:00pm',
        date: '2026-12-06',
        blurb: 'Come out for a magical afternoon with the family.',
        image: 'assets/event-christmas-party.jpg',
        membersOnly: true,
        special: true,
        adult: null,
        youth: null
    },
    {
        slug: 'bowling-pizza-party',
        title: 'Bowling & Pizza Party',
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2027-01-29',
        blurb: 'Roll in for strikes, stay for slices. Bowling and pizza night starts with YOU.',
        image: 'assets/event-bowling.jpg',
        membersOnly: true,
        adult: null,
        youth: null
    },
    {
        slug: 'rgm-games-night',
        title: "Members' Regular General Meeting & Games Night",
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2027-02-01',
        dateTbd: true,
        endsOn: '2027-02-28',
        blurb: 'Come out and be part of the decision making.',
        image: 'assets/event-games-night.jpg',
        adult: 0,
        youth: 0,
        meal: 5,
        mealFreeUnder: 6,
        ages: { youth: '6–17' }
    },
    {
        slug: 'volunteer-appreciation-dinner',
        title: 'Volunteer Appreciation Dinner',
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2027-04-24',
        blurb: 'Thank you to our amazing volunteers!',
        image: 'assets/event-volunteer-dinner.jpg',
        adult: 0,
        youth: 0
    },
    {
        slug: 'agm-election',
        title: 'Annual General Meeting & Election',
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2027-05-09',
        blurb: 'Your voice shapes the future. Come out and vote.',
        image: 'assets/event-agm.jpg',
        adult: 0,
        youth: 0,
        meal: 5
    },
    {
        slug: 'independence-gala',
        title: 'Independence Dinner & Dance Gala',
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2027-05-22',
        blurb: "Celebrating another year of Guyana's independence.",
        image: 'assets/event-independence-gala.jpg',
        adult: null,
        youth: null,
        special: true
    },
    {
        /* Called as needed rather than scheduled — stays off the calendar,
           but members can still register for it. Give it a `date` and remove
           `onCall` when one is actually called. */
        slug: 'special-general-meeting',
        title: 'Special General Meeting',
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '',
        onCall: true,
        blurb: 'Called when a matter needs the membership to decide before the next regular meeting.',
        image: 'assets/event-general-meeting.jpg',
        adult: 0,
        youth: 0,
        meal: 5
    }
];