import { OllamaProvider } from "./llm/ollama";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {

    // =========================
    // 1. Connect MCP
    // =========================

    const mcp = new Client({
        name: "ai-assistant",
        version: "1.0.0",
    });

    const transport = new StdioClientTransport({
        command: "npx",
        args: [
            "tsx",
            "../mcp-weather/src/index.ts",
        ],
    });

    await mcp.connect(transport);

    console.log("MCP connected");


    // =========================
    // 2. Get MCP tools
    // =========================

    const { tools } = await mcp.listTools();

    console.log(
        "Tools:",
        tools.map(tool => tool.name)
    );


    // =========================
    // 3. User chat
    // =========================

    const userMessage =
        "Thời tiết ở Helsinki hôm nay thế nào?";


    // =========================
    // 4. Send chat + MCP tools
    //    to Ollama
    // =========================

    const llm = new OllamaProvider();

    const firstResponse = await llm.chat(
        [
            {
                role: "user",
                content: userMessage,
            },
        ],
        tools
    );


    console.log("\nLLM first response:");

    console.log(
        JSON.stringify(
            firstResponse,
            null,
            2
        )
    );


    // =========================
    // 5. Check tool call
    // =========================

    const toolCall =
        firstResponse.message?.tool_calls?.[0];

    if (!toolCall) {

        console.log(
            "LLM did not request a tool."
        );

        return;
    }


    const toolName =
        toolCall.function.name;

    const toolArguments =
        toolCall.function.arguments;


    console.log("\nLLM requested:");

    console.log(toolName);

    console.log(toolArguments);


    // =========================
    // 6. MCP executes tool
    // =========================

    const toolResult =
        await mcp.callTool({
            name: toolName,
            arguments: toolArguments,
        });


    console.log("\nMCP result:");

    console.log(
        JSON.stringify(
            toolResult,
            null,
            2
        )
    );


    // =========================
    // 7. Send MCP result
    //    back to Ollama
    // =========================

    const finalResponse =
        await llm.chat(
            [
                {
                    role: "user",
                    content: userMessage,
                },

                firstResponse.message,

                {
                    role: "tool",
                    content: JSON.stringify(
                        toolResult
                    ),
                },
            ],
            []
        );


    // =========================
    // 8. Final answer
    // =========================

    console.log("\nFinal answer:");

    console.log(
        finalResponse.message?.content
    );


    await mcp.close();
}

main().catch(console.error);