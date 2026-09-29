import { OllamaProvider } from "./llm/ollama.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";

export function createProvider() {
    switch (process.env.LLM_PROVIDER ?? "ollama") {
        case "anthropic": return new AnthropicProvider(process.env.ANTHROPIC_API_KEY!);
        case "openai": return new OpenAIProvider(process.env.OPENAI_API_KEY!);
        default: return new OllamaProvider(process.env.OLLAMA_URL ?? "http://localhost:11434",
            process.env.OLLAMA_MODEL ?? "qwen2.5:7b");
    }
}