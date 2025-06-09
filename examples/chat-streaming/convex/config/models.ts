// Centralized model configuration - single source of truth
import { z } from "zod";

// Model provider types
export const ModelProvider = z.enum(["openai", "anthropic", "google", "groq", "perplexity"]);
export type ModelProvider = z.infer<typeof ModelProvider>;

// Model IDs - keep this as the single source of truth
export const ModelId = z.enum([
  "gpt-4.1",
  "gpt-4.1-nano", 
  "claude-4-sonnet-20250514",
  "gemini-2.5-pro-preview-06-05",
  "gemini-2.5-flash-preview-05-20"
]);
export type ModelId = z.infer<typeof ModelId>;

// Embedding model IDs
export const EmbeddingModelId = z.enum([
  "text-embedding-3-small",
  "text-embedding-3-large"
]);
export type EmbeddingModelId = z.infer<typeof EmbeddingModelId>;

// Model configuration interface
export interface ModelConfig {
  id: ModelId;
  name: string;
  provider: ModelProvider;
  description: string;
  contextWindow: number;
  maxTokens: number;
  pricing: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
  capabilities: {
    chat: boolean;
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    reasoning: boolean;
  };
  category: "fast" | "balanced" | "powerful" | "reasoning";
}

// Model configurations
export const modelConfigs: Record<ModelId, ModelConfig> = {
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

// Embedding configurations
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
    provider: "openai",
    dimensions: 1536,
    pricing: 0.02,
  },
  "text-embedding-3-large": {
    id: "text-embedding-3-large", 
    name: "OpenAI Text Embedding 3 Large",
    provider: "openai",
    dimensions: 3072,
    pricing: 0.13,
  },
};

// Default models - single place to define defaults
export const DEFAULT_CHAT_MODEL: ModelId = "gpt-4.1-nano";
export const DEFAULT_EMBEDDING_MODEL: EmbeddingModelId = "text-embedding-3-small";

// Utility functions
export function getModelConfig(modelId: ModelId): ModelConfig {
  return modelConfigs[modelId];
}

export function getModelsByCategory(category: ModelConfig["category"]) {
  return Object.values(modelConfigs).filter(model => model.category === category);
}

export function getModelsByCapability(capability: keyof ModelConfig["capabilities"]) {
  return Object.values(modelConfigs).filter(model => model.capabilities[capability]);
}

export function getAvailableModels() {
  return Object.values(modelConfigs).map(config => ({
    id: config.id,
    name: config.name,
    provider: config.provider,
    description: config.description,
    category: config.category,
    capabilities: config.capabilities,
    pricing: config.pricing,
  }));
} 