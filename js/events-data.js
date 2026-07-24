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
     date        'YYYY-MM-DD'. Used for ordering and for the date badge.
     dateTbd     true when the day isn't confirmed — the badge shows "TBD"
                 and the event stays listed for the whole month.
     endsOn      Last day it counts as upcoming. Defaults to `date`.
     adult/youth Ticket price in CAD:
                   null → price not announced yet (people register interest)
                   0    → free, RSVP only
                   25   → $25 a ticket, checks out through Stripe
   ========================================================================== */

window.GCCA_EVENTS = [
    {
        slug: 'stampede-golf-bbq',
        title: 'Stampede Golf & BBQ',
        venue: 'Golf Fanatics',
        address: '',
        time: '',
        date: '2026-07-18',
        blurb: 'Fire up your swing and your appetite. Golf and BBQ lunch is the perfect combo.',
        image: 'images/event-golf-bbq.jpg',
        adult: null,
        youth: null
    },
    {
        slug: 'carifest',
        title: 'Carifest',
        venue: 'Cowboys Park',
        address: '',
        time: 'Morning',
        date: '2026-08-15',
        blurb: 'Join the GCCA parade for a fun morning of Caribbean rhythm and food.',
        image: 'images/event-carifest.jpg',
        adult: 0,
        youth: 0
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
        image: 'images/event-general-meeting.jpg',
        adult: 0,
        youth: 0
    },
    {
        slug: 'caribbean-sports-day',
        title: 'Caribbean Sports Day',
        venue: 'Rotary Challenger Park',
        address: '',
        time: '',
        date: '2026-09-12',
        blurb: 'Participate in one or more of the sports: football, basketball, cricket, dominoes, track & field.',
        image: 'images/event-sports-day.jpg',
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
        image: 'images/event-taste-of-guyana.jpg',
        adult: null,
        youth: null
    },
    {
        slug: 'family-christmas-party',
        title: 'Family Christmas Party',
        venue: 'SVG Hall',
        address: '',
        time: '2:00pm',
        date: '2026-12-06',
        blurb: 'Come out for a magical afternoon with the family.',
        image: 'images/event-christmas-party.jpg',
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
        image: 'images/event-bowling.jpg',
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
        image: 'images/event-games-night.jpg',
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
        image: 'images/event-volunteer-dinner.jpg',
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
        image: 'images/event-agm.jpg',
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
        image: 'images/event-independence-gala.jpg',
        adult: null,
        youth: null
    }
];