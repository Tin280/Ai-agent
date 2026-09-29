import { OllamaProvider } from "./llm/ollama";

const llm = new OllamaProvider();

const res = await llm.chat(
    [{ role: "user", content: "Thời tiết ở Ho Chi Minh thế nào?" }],
    [
        {
            name: "get_weather",
            description: "Lấy thời tiết hiện tại của một thành phố",
            inputSchema: {
                type: "object",
                properties: { city: { type: "string", description: "Tên thành phố" } },
                required: ["city"],
            },
        },
    ]
);

console.log(JSON.stringify(res, null, 2));