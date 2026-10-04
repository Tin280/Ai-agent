import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { frontPage, topRecent, searchStories } from "./hn.js";
import { getTechNews, SOURCE_NAMES } from "./rss.js";

const server = new McpServer({ name: "news-server", version: "1.0.0" });

// Never console.log in a stdio MCP server. Use console.error.
async function run(fn: () => Promise<unknown>) {
    try {
        return { content: [{ type: "text" as const, text: JSON.stringify(await fn()) }] };
    } catch (e) {
        console.error(e);
        return { content: [{ type: "text" as const, text: `News error: ${(e as Error).message}` }], isError: true };
    }
}

const limit = (max: number, def: number) => z.number().int().min(1).max(max).default(def);

server.registerTool(
    "get_hackernews_front_page",
    {
        description:
            "Get the stories currently on the Hacker News front page (news.ycombinator.com). " +
            "Use for 'what's on Hacker News', 'HN top stories', 'what are developers talking about'.",
        inputSchema: { limit: limit(30, 10) },
    },
    ({ limit }) => run(() => frontPage(limit))
);

server.registerTool(
    "get_hackernews_top_recent",
    {
        description:
            "Get the best Hacker News stories posted within the last N hours (default 24), ranked by popularity. " +
            "Use for 'what's new on Hacker News today' or 'this week'.",
        inputSchema: {
            hours: z.number().int().min(1).max(168).default(24).describe("Look back this many hours"),
            min_points: z.number().int().min(0).default(50).describe("Minimum points to include"),
            limit: limit(30, 10),
        },
    },
    ({ hours, min_points, limit }) => run(() => topRecent(hours, min_points, limit))
);

server.registerTool(
    "search_hackernews",
    {
        description: "Search Hacker News stories by keyword, e.g. 'rust', 'llm agents', 'postgres'.",
        inputSchema: { query: z.string().describe("Search keywords"), limit: limit(20, 8) },
    },
    ({ query, limit }) => run(() => searchStories(query, limit))
);

server.registerTool(
    "get_tech_news",
    {
        description:
            "Get the latest tech news headlines from news sites (TechCrunch, The Verge, Ars Technica, Wired), newest first. " +
            "Use for general technology news that is not specifically about Hacker News.",
        inputSchema: {
            sources: z.array(z.enum(SOURCE_NAMES)).optional().describe("Limit to these sources. Omit for all."),
            limit: limit(30, 10),
        },
    },
    ({ sources, limit }) => run(() => getTechNews(sources, limit))
);

await server.connect(new StdioServerTransport());