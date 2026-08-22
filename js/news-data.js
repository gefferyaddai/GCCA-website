/* ==========================================================================
   GCCA stories — the content behind the News page
   --------------------------------------------------------------------------
   This is the only file to edit when there is a new story to publish. The
   News page reads it, sorts by date, builds the cards and works out the
   filter chips from whatever categories are used. No markup to touch.

   FIELDS
     title      required
     category   required — free text; the chips build themselves from these
     date       required — YYYY-MM-DD
     blurb      required — a line or two; all that shows on the card
     body       optional — array of paragraphs. Each may carry inline markup
                (<b>, <i>, <a>, and a whole <ul> as one entry). A story with
                a body gets a "Read the full story" arrow; one without does
                not, so a card never opens an empty panel.
     image      optional — 3:2 works best; omitted cards get a flag panel
     alt        required when there is an image
     link       optional — external links open in a new tab automatically
     featured   optional — at most one; runs large at the top of the page
     secondary  optional — the two cards beside the featured one

   Dates, venues and prices repeat information held in js/events-data.js.
   That file is the authority: if an event moves, change it there and then
   correct any story here that quotes it.
   ========================================================================== */

const GCCA_STORIES = [
    {
        title:    'Carifest turns 45, and GCCA walks it again',
        category: 'Events',
        date:     '2026-08-18',
        blurb:    'Calgary\u2019s Caribbean Carnival marked its forty-fifth year this August, and the GCCA band was on the route for it.',
        image:    'assets/carifest/band-downtown.jpg',
        alt:      'The GCCA band in full costume with the downtown Calgary skyline behind them',
        featured: true,
        body: [
            'Carifest \u2014 Calgary\u2019s Caribbean Carnival, organised each year by the Caribbean Community Council of Calgary \u2014 marked <b>45 years</b> in 2026, running from 13 to 16 August across several venues in the city.',
            'The programme spanned the four days: dance workshops in dancehall, Haitian folkloric and soca; an after-work party billed as Vintage Vibes; a night carnival with DJs and Caribbean cooking; the daytime parade along Stephen Avenue; Carnival in D Park at Cowboys Park with live entertainment, food and vendors; and a reggae concert to close, headlined by Caleb Hart. Most of it was free to attend.',
            'GCCA Calgary walks Carifest as a single band. Registration covers the costume \u2014 $50 for adults and $30 for youth \u2014 and the association handles the build, the transport, and getting everybody lined up on the day. Members of every age walk it together.',
            'The festival drew press attention again this year: the <i>Calgary Herald</i> photographed the celebrations at Cowboys Park on Saturday 15 August, with images by Darren Makowichuk carried by Postmedia.',
            'Photographs and video from the day are collected on our <a href="carifest.html">Carifest page</a>. If you would like to walk with us next year, costume registration opens through the <a href="events.html#register">events page</a>.'
        ]
    },
    {
        title:    'We are looking for volunteers',
        category: 'Community',
        date:     '2026-08-12',
        blurb:    'Every event the association runs is put on by members giving their time. Six areas need hands this season.',
        image:    'assets/strip/strip-volunteer.jpg',
        alt:      'A volunteer receiving a certificate at the appreciation dinner',
        secondary: true,
        body: [
            'GCCA Calgary is a volunteer-run association. There is no paid staff: every event on the calendar happens because members put their hands up for it.',
            'Six areas need help this season, and they are the options on the membership form:',
            '<ul><li><b>Independence Dinner and Dance</b> \u2014 setup, door, service, teardown</li><li><b>Stampede Golf</b> \u2014 registration, scoring, the BBQ</li><li><b>Taste of Guyana</b> \u2014 kitchen, serving, front of house</li><li><b>Family Christmas Party</b> \u2014 decorating, gifts, running the children\u2019s programme</li><li><b>Casino</b> \u2014 the AGLC charitable gaming volunteer shifts that fund much of what we do</li><li><b>Other</b> \u2014 Carifest and Sports Day, which need the most hands of all</li></ul>',
            'You do not need to commit to a whole season. Most people take one or two events a year, and plenty of members start by helping at the event they already planned to attend.',
            'Tick the areas that interest you on the <a href="index.html#membership">membership form</a>, or email <a href="mailto:gccacalgary@gmail.com">gccacalgary@gmail.com</a> and we will put you in touch with whoever is coordinating.'
        ]
    },
    {
        title:    'What\u2019s coming up this season',
        category: 'Events',
        date:     '2026-08-05',
        blurb:    'Eight dates between now and next May, from Sports Day in September to the Independence Gala.',
        image:    'assets/strip/strip-sports.jpg',
        alt:      'Team colours at Caribbean Sports Day',
        secondary: true,
        body: [
            'The calendar through to May is set. Dates and venues below are the ones held on the <a href="events.html">events page</a>, which is always the authority if anything moves.',
            '<ul><li><b>12 September</b> \u2014 Caribbean Sports Day, Rotary Challenger Park. Football, basketball, cricket, dominoes, track and field. Free, but please RSVP.</li><li><b>10 October</b> \u2014 Taste of Guyana, Portuguese Community Centre, Our Lady of Fatima Parish Hall.</li><li><b>6 December</b> \u2014 Family Christmas Party, SVG Hall.</li><li><b>29 January</b> \u2014 Bowling &amp; Pizza Party, venue to be confirmed.</li><li><b>24 April</b> \u2014 Volunteer Appreciation Dinner.</li><li><b>9 May</b> \u2014 Annual General Meeting and Election.</li><li><b>22 May</b> \u2014 Independence Dinner &amp; Dance Gala.</li></ul>',
            'Everything is open to the wider Calgary community except the meetings marked members-only. Bring a friend who has never tasted pepperpot.',
            'Registration for anything ticketed goes through the <a href="events.html#register">events page</a>.'
        ]
    },
    {
        title:    'Caribbean Sports Day returns in September',
        category: 'Events',
        date:     '2026-07-20',
        blurb:    'A full day of football, basketball, cricket, dominoes and track at Rotary Challenger Park.',
        image:    'assets/event-sports-day.jpg',
        alt:      'Players on the field at Caribbean Sports Day',
        body: [
            'Caribbean Sports Day returns on <b>Saturday 12 September</b>, 9:00am to 5:00pm, at Rotary Challenger Park, 3688 48 Ave NE.',
            'The day runs on friendly competition rather than serious sport. Football, basketball, cricket, dominoes and track and field all have a place on the schedule, and members take part in one event or several depending on the mood.',
            'It is free to attend and free to enter, but an RSVP helps with planning numbers for food and equipment.',
            'Sports Day is one of the events that needs the most volunteers \u2014 setup, scoring, the food tent and teardown. If you can give a couple of hours, say so on the <a href="index.html#membership">membership form</a>.'
        ]
    },
    {
        title:    'Taste of Guyana moves to Our Lady of Fatima Parish Hall',
        category: 'Culture',
        date:     '2026-07-06',
        blurb:    'October\u2019s food night has a confirmed venue: the Portuguese Community Centre in southeast Calgary.',
        image:    'assets/culture-food.jpg',
        alt:      'Dishes of Guyanese food laid out together',
        body: [
            'Taste of Guyana takes place on <b>Saturday 10 October</b> at the Portuguese Community Centre, Our Lady of Fatima Parish Hall, 4747 30th St SE.',
            'The evening is exactly what the name says: a table of Guyanese cooking, made by members, eaten together. Pepperpot, cook-up rice, metemgee, roti and curry, garlic pork, chow mein, and the sweet end of things \u2014 black cake, pine tart, cheese roll, salara, with mauby, sorrel and homemade ginger beer to drink.',
            'It is one of the clearest demonstrations of the national motto there is. Six ancestries, six sets of recipes, one holiday table.',
            'Ticket prices are still being set. Watch the <a href="events.html">events page</a>, or join the mailing list below and it will come to you.'
        ]
    },
    {
        title:    'Family Christmas Party set for 6 December',
        category: 'Community',
        date:     '2026-06-22',
        blurb:    'The children\u2019s party returns to SVG Hall, with Santa, food and a programme for the little ones.',
        image:    'assets/strip/strip-christmas.jpg',
        alt:      'Families with Santa at the GCCA Christmas party',
        body: [
            'The Family Christmas Party is booked for <b>Sunday 6 December</b> at SVG Hall.',
            'It is the association\u2019s biggest family event of the year: a full children\u2019s programme, a visit from Santa, food, and a hall of members of every generation in the same room.',
            'Volunteers are needed for decorating, gifts and running the children\u2019s programme. This is the easiest event to help with if you have never volunteered before \u2014 most of the work happens in the two hours before doors.',
            'Details and registration will go up on the <a href="events.html">events page</a> closer to the date.'
        ]
    },
    {
        title:    'Members\u2019 meetings and the Annual General Meeting',
        category: 'Governance',
        date:     '2026-06-02',
        blurb:    'Regular General Meetings run through the season, with the AGM and executive election in May.',
        image:    'assets/event-general-meeting.jpg',
        alt:      'Members seated around tables at a general meeting',
        body: [
            'GCCA Calgary is a member-run society. The executive is elected by the membership and answers to it, and the by-laws set out how that works in detail.',
            'Regular General Meetings run through the season and are open to members. A meal is usually available for a small charge, which is why the registration form asks about numbers.',
            'The <b>Annual General Meeting and Election</b> is set for <b>9 May</b>. That is the meeting where the executive for the following year is chosen, and where any member in good standing can stand for a position.',
            'If you are not sure whether your membership is current, email <a href="mailto:gccacalgary@gmail.com">gccacalgary@gmail.com</a>. The full rules are in the <a href="bylaws.html">by-laws</a>.'
        ]
    },
    {
        title:    'Independence Dinner &amp; Dance Gala closes the season',
        category: 'Events',
        date:     '2026-05-18',
        blurb:    'May\u2019s gala marks Guyana\u2019s independence with dinner, music and dancing.',
        image:    'assets/event-independence-gala.jpg',
        alt:      'Guests dressed for the Independence dinner and dance',
        body: [
            'The Independence Dinner &amp; Dance Gala is the association\u2019s formal evening, held each May to mark Guyana\u2019s independence.',
            'Next year\u2019s falls on <b>22 May</b>. Dinner, music and dancing, and the one night in the calendar where everyone dresses for it.',
            'It is also one of the events with the longest volunteer list \u2014 setup, door, service and teardown all need hands, and the evening does not happen without them.',
            'Tickets and venue will be confirmed on the <a href="events.html">events page</a>.'
        ]
    },
    {
        title:    'Thirty-five years of turning up for each other',
        category: 'Community',
        date:     '2026-04-25',
        blurb:    'Founded on 25 April 1991, the association has been a volunteer-run home for Guyanese families in Calgary ever since.',
        image:    'assets/strip/strip-cake.jpg',
        alt:      'The cake made for a GCCA anniversary celebration',
        body: [
            'The Guyana Canada Cultural Association (Calgary) was founded on <b>25 April 1991</b>. It has been a volunteer-run home for Guyanese people, families and friends across the city ever since.',
            'What the association does has stayed much the same across those years: the celebrations that keep traditions alive \u2014 Mashramani, Independence, Diwali, Phagwah \u2014 family programming that gives children a real connection to where they come from, and a network of neighbours for newcomers finding their footing in Calgary.',
            'None of it is run by paid staff. Every event is put on by members giving their evenings and weekends to it.',
            'Whether you arrived last month or were born here to Guyanese parents, there is a seat at the table. The <a href="index.html#membership">membership page</a> has the details, and fees start at $5 a year.'
        ]
    }
];

if (typeof window !== 'undefined') window.GCCA_STORIES = GCCA_STORIES;
