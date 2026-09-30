import { OllamaProvider } from "./llm/ollama.js";
import { McpHub } from "./mcp-client.js";
import { runAgent } from "./agent.js";

const hub = new McpHub();
const tools = await hub.connect("npx", [
    "tsx",
    process.env.MCP_WEATHER_PATH ?? "../mcp-weather/src/index.ts",
]);
console.log("Tools:", tools.map((t) => t.name));

const question = process.argv[2] ?? "Thời tiết ở Helsinki hiện tại thế nào?";
const answer = await runAgent(new OllamaProvider(), hub, tools, [
    { role: "user", content: question },
]);

console.log("\n💬 Answer:", answer);
await hub.close();