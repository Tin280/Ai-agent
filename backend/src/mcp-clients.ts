import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class McpHub {
    private clients = new Map<string, Client>();   // toolName -> client

    async connect(command: string, args: string[]) {
        const client = new Client({ name: "ai-assistant", version: "1.0.0" });
        await client.connect(new StdioClientTransport({ command, args }));
        const { tools } = await client.listTools();
        tools.forEach((t) => this.clients.set(t.name, client));
        return tools;
    }

    async call(name: string, args: Record<string, unknown>) {
        const res = await this.clients.get(name)!.callTool({ name, arguments: args });
        return (res.content as any[]).map((c) => c.text ?? "").join("\n");
    }
}