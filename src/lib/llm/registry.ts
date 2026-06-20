import { AnthropicProvider } from "./anthropic-provider";
import { OpenAIProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import type { LLMProvider, ModelInfo } from "./types";

// All models across all providers (doesn't require keys)
const ALL_MODELS: ModelInfo[] = [
  ...new AnthropicProvider("").listModels(),
  ...new OpenAIProvider("").listModels(),
  ...new GeminiProvider("").listModels(),
];

export function parseModelString(modelString: string): {
  providerId: string;
  modelId: string;
} {
  const [providerId, ...rest] = modelString.split("/");
  return { providerId, modelId: rest.join("/") };
}

// Create a provider instance with a specific API key
export function createProvider(providerId: string, apiKey: string): LLMProvider {
  switch (providerId) {
    case "anthropic":
      return new AnthropicProvider(apiKey);
    case "openai":
      return new OpenAIProvider(apiKey);
    case "gemini":
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

// Returns all known models (for the model selector UI)
export function getAllModels(): ModelInfo[] {
  return ALL_MODELS;
}

// Returns models filtered to only providers the user has keys for
export function getModelsForProviders(providerIds: string[]): ModelInfo[] {
  return ALL_MODELS.filter((m) => providerIds.includes(m.providerId));
}
