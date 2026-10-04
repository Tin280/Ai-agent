// Hacker News data via the free Algolia API (no key needed).
// One request returns whole stories, so no need to fetch items one by one.
const ALGOLIA = "https://hn.algolia.com/api/v1";

interface Hit {
    objectID: string;
    title: string | null;
    url: string | null;
    points: number | null;
    num_comments: number | null;
    author: string;
    created_at: string;
}

async function getJson(url: string): Promise<{ hits: Hit[] }> {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Hacker News API returned ${res.status}`);
    return res.json() as Promise<{ hits: Hit[] }>;
}

const toStory = (h: Hit) => ({
    title: h.title,
    url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`, // Ask HN posts have no url
    discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points,
    comments: h.num_comments,
    author: h.author,
    posted: h.created_at,
});

/** What is on the front page of news.ycombinator.com right now */
export async function frontPage(limit: number) {
    const data = await getJson(`${ALGOLIA}/search?tags=front_page&hitsPerPage=${limit}`);
    return data.hits.map(toStory);
}

/** Stories posted in the last N hours with at least minPoints, best first */
export async function topRecent(hours: number, minPoints: number, limit: number) {
    const since = Math.floor(Date.now() / 1000) - hours * 3600;
    const filters = encodeURIComponent(`created_at_i>${since},points>${minPoints}`);
    const data = await getJson(`${ALGOLIA}/search?tags=story&numericFilters=${filters}&hitsPerPage=${limit}`);
    return data.hits.map(toStory);
}

/** Search stories by keyword */
export async function searchStories(query: string, limit: number) {
    const data = await getJson(
        `${ALGOLIA}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`
    );
    return data.hits.map(toStory);
}