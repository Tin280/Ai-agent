// GitHub REST API calls. Plain fetch, no extra dependencies.
const API = "https://api.github.com";

type Json = Record<string, any>;

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN is not set. Add it to mcp-github/.env");
  return t;
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "ai-assistant-mcp", // GitHub rejects requests without a User-Agent
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const hint =
      res.status === 401 ? "Token is invalid or expired."
      : res.status === 403 || res.status === 429 ? "Rate limited, or the token lacks permission."
      : res.status === 404 ? "Not found, or the token cannot access it."
      : "";
    throw new Error(`GitHub API ${res.status}. ${hint}`);
  }
  return res.json() as Promise<T>;
}

// When the user does not name an owner, use the account the token belongs to.
let me: string | undefined;
async function resolveOwner(owner?: string): Promise<string> {
  if (owner) return owner;
  me ??= (await gh<Json>("/user")).login as string;
  return me;
}

export async function listMyRepos(limit: number) {
  const repos = await gh<Json[]>(`/user/repos?sort=pushed&per_page=${limit}`);
  return repos.map((r) => ({
    name: r.full_name,
    description: r.description,
    language: r.language,
    stars: r.stargazers_count,
    open_issues: r.open_issues_count,
    private: r.private,
    last_push: r.pushed_at,
    url: r.html_url,
  }));
}

export async function listIssues(a: { repo: string; owner?: string; state: string; limit: number }) {
  const owner = await resolveOwner(a.owner);
  // The issues endpoint also returns pull requests, so fetch extra and filter them out.
  const items = await gh<Json[]>(`/repos/${owner}/${a.repo}/issues?state=${a.state}&per_page=50`);
  return items
    .filter((i) => !i.pull_request)
    .slice(0, a.limit)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      author: i.user?.login,
      labels: (i.labels as Json[]).map((l) => l.name),
      comments: i.comments,
      created: i.created_at,
      url: i.html_url,
    }));
}

export async function listPullRequests(a: { repo: string; owner?: string; state: string; limit: number }) {
  const owner = await resolveOwner(a.owner);
  const items = await gh<Json[]>(`/repos/${owner}/${a.repo}/pulls?state=${a.state}&per_page=${a.limit}`);
  return items.map((p) => ({
    number: p.number,
    title: p.title,
    state: p.state,
    draft: p.draft,
    author: p.user?.login,
    created: p.created_at,
    url: p.html_url,
  }));
}

export async function listRecentCommits(a: { repo: string; owner?: string; limit: number }) {
  const owner = await resolveOwner(a.owner);
  const items = await gh<Json[]>(`/repos/${owner}/${a.repo}/commits?per_page=${a.limit}`);
  return items.map((c) => ({
    sha: (c.sha as string).slice(0, 7),
    message: (c.commit.message as string).split("\n")[0],
    author: c.commit.author?.name,
    date: c.commit.author?.date,
    url: c.html_url,
  }));
}

export async function createIssue(a: { repo: string; owner?: string; title: string; body?: string }) {
  const owner = await resolveOwner(a.owner);
  const issue = await gh<Json>(`/repos/${owner}/${a.repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: a.title, body: a.body }),
  });
  return { number: issue.number, title: issue.title, url: issue.html_url };
}
