/* ==========================================================================
   GET /api/news
   --------------------------------------------------------------------------
   Headlines from Guyanese news outlets, merged newest-first.

   This has to run on the server. The feeds send no CORS headers, so a browser
   fetching them directly is blocked — the request never even reaches them.

   WHAT IT RETURNS: headline, one-line snippet, source, link. Never the article.
   We are pointing readers at other people's journalism, not republishing it.

   THE SOURCES were chosen for balance: one state-owned paper and two
   independents, so a community association is not seen to take a side.

     Kaieteur News    independent daily, founded 1994
     Guyana Chronicle state-owned — read it as the government's paper
     Demerara Waves   digital-first independent

   Stabroek News is deliberately absent. It ceased print and online publication
   in March 2026 when its parent company went into voluntary liquidation. It
   was the obvious pick for years; it is not an option now.

   All three verified live on 15 August 2026.
   ========================================================================== */

/* Guyana Chronicle sits behind a Sucuri firewall that returns 403 to anything
   that looks automated. It answers normally to a browser user-agent. The other
   two do not care, but sending it everywhere keeps the code simple. */
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const SOURCES = [
    { name: 'Kaieteur News',    url: 'https://www.kaieteurnewsonline.com/feed/' },
    { name: 'Guyana Chronicle', url: 'https://guyanachronicle.com/feed/' },
    { name: 'Demerara Waves',   url: 'https://demerarawaves.com/feed/' }
];

const PER_SOURCE = 6;        // taken from each before merging
const TOTAL = 9;             // returned to the page
const TIMEOUT_MS = 8000;

/* --------------------------------------------------------------------------
   Parsing. Deliberately regex rather than an XML library: three known feeds,
   all standard WordPress RSS, and no dependency to keep patched.
   -------------------------------------------------------------------------- */
const ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ',
    hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”'
};

function decode(text) {
    return String(text || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
        .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES[name.toLowerCase()] || whole);
}

const tagOf = (xml, tag) => {
    const m = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i'));
    return m ? decode(m[1]).trim() : '';
};

/* One line, no markup. Each outlet tops its description with its own
   boilerplate, which is noise in a list of headlines. */
function snippetFrom(xml) {
    let text = tagOf(xml, 'description') || tagOf(xml, 'content:encoded');

    /* Strip markup and normalise spacing BEFORE removing the boilerplate.
       Both patterns are anchored to the start, and a stray leading space left
       behind by a removed tag is enough to stop them matching. */
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    text = text
        .replace(/^Last Updated on[^]*?by\s+\S+\s*/i, '')   // Demerara Waves
        .replace(/^Kaieteur News\s*[–—-]\s*/i, '') // Kaieteur
        .trim();

    if (text.length <= 150) return text;
    const cut = text.slice(0, 150);
    return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.\s]+$/, '') + '…';
}

async function readFeed(source) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(source.url, {
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/rss+xml, application/xml, text/xml' }
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const xml = await response.text();
        const items = (xml.match(/<item>[\s\S]*?<\/item>/gi) || []).slice(0, PER_SOURCE);

        return items.map(item => {
            const published = tagOf(item, 'pubDate');
            const when = published ? new Date(published) : null;
            return {
                source: source.name,
                title: tagOf(item, 'title'),
                link: tagOf(item, 'link'),
                snippet: snippetFrom(item),
                published: when && !isNaN(when) ? when.toISOString() : null
            };
        }).filter(item => item.title && item.link);
    } finally {
        clearTimeout(timer);
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    /* allSettled, not all: one outlet having a bad morning must not blank the
       section. Whatever came back is still worth showing. */
    const results = await Promise.allSettled(SOURCES.map(readFeed));

    const perSource = [];
    const failed = [];
    results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.length) {
            result.value.sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
            perSource.push(result.value);
        } else {
            failed.push(SOURCES[i].name);
        }
    });

    if (!perSource.length) {
        console.error('[news] every feed failed:', failed.join(', '));
        return res.status(503).json({ error: 'No headlines available.', failed });
    }

    /* Take one from each outlet in turn rather than simply sorting everything
       by date. Kaieteur publishes far more often than the other two, so a
       straight date sort hands the whole section to one paper — which defeats
       the point of carrying a state voice and two independent ones. Round-robin
       keeps all three visible; within each outlet it is still newest first. */
    const items = [];
    for (let round = 0; items.length < TOTAL; round++) {
        let addedThisRound = false;
        for (const list of perSource) {
            if (list[round]) {
                items.push(list[round]);
                addedThisRound = true;
                if (items.length >= TOTAL) break;
            }
        }
        if (!addedThisRound) break;      // every list exhausted
    }

    /* Cached at Vercel's edge for 30 minutes, so the outlets see one request
       per half hour rather than one per visitor. stale-while-revalidate means
       a visitor during a refresh gets the slightly old copy instantly instead
       of waiting on three external sites. */
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');

    return res.status(200).json({
        items: items.slice(0, TOTAL),
        sources: SOURCES.map(s => s.name),
        failed,
        fetchedAt: new Date().toISOString()
    });
};
