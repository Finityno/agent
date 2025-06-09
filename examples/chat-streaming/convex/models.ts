// Model configurations and utilities for AI providers
import { z } from "zod";
import { ModelConfig, ModelId, EmbeddingModelId } from "./types";

// Zod schemas for validation
const ModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(["openai", "anthropic", "google", "groq", "perplexity"]),
  description: z.string(),
  contextWindow: z.number(),
  maxTokens: z.number(),
  pricing: z.object({
    input: z.number(),
    output: z.number(),
  }),
  capabilities: z.object({
    chat: z.boolean(),
    streaming: z.boolean(),
    functionCalling: z.boolean(),
    vision: z.boolean(),
    reasoning: z.boolean(),
  }),
  category: z.enum(["fast", "balanced", "powerful", "reasoning"]),
});

const EmbeddingConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.literal("openai"),
  dimensions: z.number(),
  pricing: z.number(),
});

// Environment variable validation
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in your Convex environment.`
    );
  }
  return value;
}

// Model configurations matching the user's specified model IDs
export const modelConfigs: Record<string, ModelConfig> = {
  // OpenAI Models
  "gpt-4.1": {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    description: "Latest and most advanced GPT model",
    contextWindow: 128000,
    maxTokens: 16384,
    pricing: { input: 2.5, output: 10 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
    },
    category: "powerful",
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    description: "Ultra-fast and efficient latest model",
    contextWindow: 128000,
    maxTokens: 4096,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
    },
    category: "fast",
  },
  // Anthropic Models
  "claude-4-sonnet-20250514": {
    id: "claude-4-sonnet-20250514",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    description: "Latest and most capable Claude model",
    contextWindow: 200000,
    maxTokens: 8192,
    pricing: { input: 3.0, output: 15.0 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
    },
    category: "powerful",
  },
  // Google Models  
  "gemini-2.5-pro-preview-06-05": {
    id: "gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro",
    provider: "google",
    description: "Latest and most advanced Gemini model",
    contextWindow: 1000000,
    maxTokens: 8192,
    pricing: { input: 1.25, output: 5.0 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: true,
    },
    category: "powerful",
  },
  "gemini-2.5-flash-preview-05-20": {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Ultra-fast latest Gemini model",
    contextWindow: 1000000,
    maxTokens: 8192,
    pricing: { input: 0.075, output: 0.3 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
    },
    category: "fast",
  },
};

// Embedding models
export const embeddingConfigs: Record<EmbeddingModelId, {
  id: EmbeddingModelId;
  name: string;
  provider: "openai";
  dimensions: number;
  pricing: number;
}> = {
  "text-embedding-3-small": {
    id: "text-embedding-3-small",
    name: "OpenAI Text Embedding 3 Small",
    provider: "openai" as const,
    dimensions: 1536,
    pricing: 0.02, // per 1M tokens
  },
  "text-embedding-3-large": {
    id: "text-embedding-3-large",
    name: "OpenAI Text Embedding 3 Large",
    provider: "openai" as const,
    dimensions: 3072,
    pricing: 0.13, // per 1M tokens
  },
};

// Get available models by category
export function getModelsByCategory(category: ModelConfig["category"]) {
  const validatedCategory = z.enum(["fast", "balanced", "powerful", "reasoning"]).parse(category);
  return Object.values(modelConfigs).filter(
    (model) => model.category === validatedCategory
  );
}

// Get models by capability
export function getModelsByCapability(capability: keyof ModelConfig["capabilities"]) {
  const validatedCapability = z.enum(["chat", "streaming", "functionCalling", "vision", "reasoning"]).parse(capability);
  return Object.values(modelConfigs).filter(model => model.capabilities[validatedCapability]);
}

// Export model configurations for frontend
export function getAvailableModels() {
  return Object.values(modelConfigs).map(config => {
    // Validate each config with Zod before returning
    const validatedConfig = ModelConfigSchema.parse(config);
    return {
      id: validatedConfig.id,
      name: validatedConfig.name,
      provider: validatedConfig.provider,
      description: validatedConfig.description,
      category: validatedConfig.category,
      capabilities: validatedConfig.capabilities,
      pricing: validatedConfig.pricing,
    };
  });
} 