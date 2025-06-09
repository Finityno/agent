// Centralized AI provider management
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { ModelId, ModelProvider, getModelConfig } from "./models";

// Provider configurations
export const providers = {
  openai: openai,
  anthropic: anthropic,
  google: google,
  // Custom OpenAI-compatible providers
  groq: createOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  }),
  perplexity: createOpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  }),
} as const;

// Get the correct provider and model instance for a given model ID
export function createModelInstance(modelId: ModelId) {
  const config = getModelConfig(modelId);
  
  switch (config.provider) {
    case "openai":
      return providers.openai(modelId);
    case "anthropic":
      return providers.anthropic(modelId);
    case "google":
      return providers.google(modelId);
    case "groq":
      return providers.groq(modelId);
    case "perplexity":
      return providers.perplexity(modelId);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// Get embedding model instance (currently only OpenAI supported)
export function createEmbeddingInstance(modelId: string) {
  return providers.openai.textEmbedding(modelId);
} 