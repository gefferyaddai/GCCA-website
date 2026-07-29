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
     date        'YYYY-MM-DD'. Used for ordering and for the date badge.
     dateTbd     true when the day isn't confirmed — the badge shows "TBD"
                 and the event stays listed for the whole month.
     endsOn      Last day it counts as upcoming. Defaults to `date`.
     onCall      true for meetings that are called as needed rather than
                 scheduled (e.g. a Special General Meeting). These stay off
                 the calendar but remain selectable in the registration form.
     adult/youth Ticket price in CAD:
                   null → price not announced yet (people register interest)
                   0    → free, RSVP only
                   25   → $25 a ticket
                 `youth` is the child rate (2–17). Under 2 always free.
   ========================================================================== */

window.GCCA_EVENTS = [
    {
        slug: 'stampede-golf-bbq',
        title: 'Stampede Golf & BBQ',
        venue: 'Golf Fanatics',
        address: '7100 15 St SE, Calgary, AB T2H 2Z8',
        time: 'Tee time 10:00am · Lunch 12:00pm',
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
        youth: 30
    },
    {
        slug: 'rgm-september',
        title: "Members' Regular General Meeting",
        venue: 'Venue to be confirmed',
        address: '',
        time: '',
        date: '2026-09-01',
        dateTbd: true,
        endsOn: '2026-09-30',
        blurb: 'Your voice shapes the future. Show up and be part of the decision making.',
        image: 'assets/event-general-meeting.jpg',
        adult: 0,
        youth: 0
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
        adult: 0,
        youth: 0
    },
    {
        slug: 'taste-of-guyana',
        title: 'Taste of Guyana',
        venue: 'Fatima Hall',
        address: '4747 30th St SE, Calgary',
        time: '',
        date: '2026-10-10',
        blurb: 'Treat your buds to a taste of Guyanese cuisine.',
        image: 'assets/event-taste-of-guyana.jpg',
        adult: null,
        youth: null
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
        youth: 0
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
        youth: 0
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
        youth: null
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
        youth: 0
    }
];