import Parser from "rss-parser";

const parser = new Parser({ timeout: 10_000 });

// Edit this list to add or remove sources. If a feed URL changes, only that source fails.
export const FEEDS: Record<string, string> = {
    techcrunch: "https://techcrunch.com/feed/",
    verge: "https://www.theverge.com/rss/index.xml",
    ars: "https://feeds.arstechnica.com/arstechnica/index",
    wired: "https://www.wired.com/feed/rss",
};

export const SOURCE_NAMES = Object.keys(FEEDS) as [string, ...string[]];

export async function getTechNews(sources: string[] | undefined, limit: number) {
    const names = sources?.length ? sources : SOURCE_NAMES;

    const results = await Promise.allSettled(
        names.map(async (name) => {
            const url = FEEDS[name];
            if (!url) throw new Error(`Unknown source: ${name}`);
            const feed = await parser.parseURL(url);
            return feed.items.map((i) => ({
                source: name,
                title: i.title,
                url: i.link,
                published: i.isoDate ?? i.pubDate,
                summary: (i.contentSnippet ?? "").slice(0, 200),
            }));
        })
    );

    const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const unavailable = results
        .map((r, i) => (r.status === "rejected" ? names[i] : null))
        .filter(Boolean);

    items.sort((a, b) => (Date.parse(b.published ?? "") || 0) - (Date.parse(a.published ?? "") || 0));
    return { items: items.slice(0, limit), unavailable };
}