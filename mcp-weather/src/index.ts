import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"

const server = new McpServer(
    {
        name: "weather-server",
        version: "1.0.0",
    }
);

server.registerTool(
    "get_weather",
    {
        description: "Take the data weather from the instance city",
        inputSchema: { city: z.string().describe("City name") }
    },

    async ({ city }) => {
        console.error("get_weather called with:", JSON.stringify(city));
        const geo = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        ).then((r) => r.json());

        const loc = geo.results?.[0];
        if (!loc) return { content: [{ type: "text", text: `Can't find the ${city}` }], isError: true };

        const w = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,wind_speed_10m`
        ).then((r) => r.json());

        return { content: [{ type: "text", text: JSON.stringify(w.current) }] };
    }
);

await server.connect(new StdioServerTransport());
