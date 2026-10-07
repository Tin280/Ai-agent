import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listMyRepos, listIssues, listPullRequests, listRecentCommits, createIssue } from "./github.js";

// Load mcp-github/.env no matter where the server is started from.
// Without this, the token would not reach the server when it runs as a child process.
try {
  process.loadEnvFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env"));
} catch {
  // No .env file: rely on real environment variables.
}

const server = new McpServer({ name: "github-server", version: "1.0.0" });

// Never console.log in a stdio MCP server. Use console.error.
async function run(fn: () => Promise<unknown>) {
  try {
    return { content: [{ type: "text" as const, text: JSON.stringify(await fn()) }] };
  } catch (e) {
    console.error(e);
    return { content: [{ type: "text" as const, text: `GitHub error: ${(e as Error).message}` }], isError: true };
  }
}

const repo = z.string().describe("Repository name only, e.g. ai-assistant-mcp");
const owner = z.string().optional().describe("Owner or organisation. Omit for the user's own repositories.");
const state = z.enum(["open", "closed", "all"]).default("open");
const limit = (max: number, def: number) => z.number().int().min(1).max(max).default(def);

server.registerTool(
  "list_my_github_repos",
  {
    description: "List the user's GitHub repositories, most recently pushed first, with stars, language and open issue counts.",
    inputSchema: { limit: limit(30, 10) },
  },
  ({ limit }) => run(() => listMyRepos(limit))
);

server.registerTool(
  "list_github_issues",
  {
    description: "List issues of a GitHub repository (pull requests are excluded).",
    inputSchema: { repo, owner, state, limit: limit(30, 10) },
  },
  (a) => run(() => listIssues(a))
);

server.registerTool(
  "list_github_pull_requests",
  {
    description: "List pull requests of a GitHub repository.",
    inputSchema: { repo, owner, state, limit: limit(30, 10) },
  },
  (a) => run(() => listPullRequests(a))
);

server.registerTool(
  "list_github_commits",
  {
    description: "List the most recent commits of a GitHub repository. Use to summarise recent work.",
    inputSchema: { repo, owner, limit: limit(30, 10) },
  },
  (a) => run(() => listRecentCommits(a))
);

server.registerTool(
  "create_github_issue",
  {
    description:
      "Create a new issue in a GitHub repository. " +
      "Set confirmed=true ONLY after the user has explicitly approved the title and body.",
    inputSchema: {
      repo,
      owner,
      title: z.string(),
      body: z.string().optional(),
      confirmed: z.boolean().describe("true only after the user approved this exact issue"),
    },
  },
  ({ confirmed, ...a }) =>
    confirmed
      ? run(() => createIssue(a))
      : Promise.resolve({
        content: [{ type: "text" as const, text: "Not created yet. Show the user the title and body, ask them to confirm, then call again with confirmed=true." }],
        isError: true,
      })
);

await server.connect(new StdioServerTransport());
