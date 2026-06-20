import { AnthropicProvider } from "./anthropic-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import type { LLMProvider, ModelInfo } from "./types";

const providers = new Map<string, LLMProvider>();

function ensureInitialized() {
  if (providers.size > 0) return;

  if (process.env.ANTHROPIC_API_KEY) {
    providers.set("anthropic", new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
  }
  if (process.env.OPENAI_API_KEY) {
    providers.set("openai", new OpenAIProvider(process.env.OPENAI_API_KEY));
  }
  if (process.env.GEMINI_API_KEY) {
    providers.set("gemini", new GeminiProvider(process.env.GEMINI_API_KEY));
  }
}

export function parseModelString(modelString: string): {
  providerId: string;
  modelId: string;
} {
  const [providerId, ...rest] = modelString.split("/");
  return { providerId, modelId: rest.join("/") };
}

export function getProvider(providerId: string): LLMProvider {
  ensureInitialized();
  const provider = providers.get(providerId);
  if (!provider) {
    throw new Error(
      `Provider "${providerId}" not available. Check that its API key is configured.`
    );
  }
  return provider;
}

export function getAllModels(): ModelInfo[] {
  ensureInitialized();
  return Array.from(providers.values()).flatMap((p) => p.listModels());
}
