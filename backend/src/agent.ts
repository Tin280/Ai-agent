export async function runAgent(llm: LLMProvider, hub: McpHub, tools: ToolDef[], history: ChatMessage[]) {
    for (let step = 0; step < 5; step++) {            // limit the loop
        const res = await llm.chat(history, tools);
        history.push({ role: "assistant", content: res.text, toolCalls: res.toolCalls });

        if (res.toolCalls.length === 0) return res.text;

        for (const call of res.toolCalls) {
            const output = await hub.call(call.name, call.args).catch((e) => `Error: ${e.message}`);
            history.push({ role: "tool", toolCallId: call.id, name: call.name, content: output });
        }
    }
    return "Reach the limit steps.";
}