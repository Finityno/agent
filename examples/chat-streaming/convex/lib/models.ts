import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { ModelConfig, ModelId, EmbeddingModelId } from "./types";
import { providers } from "./providers";
// Environment variable validation
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Please set it in your Convex environment.`
    );
  }
  return value;
}

export const modelConfigs: Record<string, ModelConfig> = {
  // OpenAI Models
  "gpt-4.1": {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    description: "Latest and most advanced GPT model",
    contextWindow: 200000,
    maxTokens: 8192,
    pricing: { input: 3.0, output: 12 },
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
    maxTokens: 16384,
    pricing: { input: 0.1, output: 0.4 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
    },
    category: "fast",
  },
  "o1-preview": {
    id: "o1-preview",
    name: "o1-preview",
    provider: "openai",
    description: "Advanced reasoning model",
    contextWindow: 128000,
    maxTokens: 32768,
    pricing: { input: 15, output: 60 },
    capabilities: {
      chat: true,
      streaming: false,
      functionCalling: false,
      vision: false,
      reasoning: true,
    },
    category: "reasoning",
  },
  "o1-mini": {
    id: "o1-mini",
    name: "o1-mini",
    provider: "openai",
    description: "Faster reasoning model",
    contextWindow: 128000,
    maxTokens: 65536,
    pricing: { input: 3, output: 12 },
    capabilities: {
      chat: true,
      streaming: false,
      functionCalling: false,
      vision: false,
      reasoning: true,
    },
    category: "reasoning",
  },

  // Anthropic Models
  "claude-4-sonnet-20250514": {
    id: "claude-4-sonnet-20250514",
    name: "Claude 4 Sonnet",
    provider: "anthropic",
    description: "Latest and most capable Claude model",
    contextWindow: 500000,
    maxTokens: 8192,
    pricing: { input: 4, output: 20 },
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
    contextWindow: 2000000,
    maxTokens: 8192,
    pricing: { input: 1.5, output: 6 },
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
    pricing: { input: 0.05, output: 0.2 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: true,
      reasoning: false,
    },
    category: "fast",
  },

  // Groq Models (Fast inference)
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "groq",
    description: "Fast inference with Groq",
    contextWindow: 32768,
    maxTokens: 8192,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: true,
      vision: false,
      reasoning: false,
    },
    category: "fast",
  },

  // Perplexity Models (Search-enhanced)
  "llama-3.1-sonar-large-128k-online": {
    id: "llama-3.1-sonar-large-128k-online",
    name: "Sonar Large Online",
    provider: "perplexity",
    description: "Search-enhanced responses",
    contextWindow: 127072,
    maxTokens: 4096,
    pricing: { input: 1, output: 1 },
    capabilities: {
      chat: true,
      streaming: true,
      functionCalling: false,
      vision: false,
      reasoning: false,
    },
    category: "balanced",
  },
};

// Embedding models
export const embeddingConfigs = {
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

// Helper functions to get models
export function getChatModel(modelId: ModelId) {
  const config = modelConfigs[modelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(`Provider not configured: ${config.provider}`);
  }

  return provider.chat(modelId);
}

export function getEmbeddingModel(modelId: EmbeddingModelId) {
  const config = embeddingConfigs[modelId];
  if (!config) {
    throw new Error(`Unknown embedding model: ${modelId}`);
  }

  const provider = providers[config.provider];
  if (!provider) {
    throw new Error(`Provider not configured: ${config.provider}`);
  }

  return provider.textEmbedding(modelId);
}

// Get available models by category
export function getModelsByCategory(category: ModelConfig["category"]) {
  return Object.values(modelConfigs).filter(
    (model) => model.category === category
  );
}

// Get models by capability
export function getModelsByCapability(capability: keyof ModelConfig["capabilities"]) {
  return Object.values(modelConfigs).filter(model => model.capabilities[capability]);
}

// Default models for different use cases
export const defaultModels = {
  chat: getChatModel("gpt-4.1"), // Latest GPT model as default
  reasoning: getChatModel("o1-mini"), // For complex reasoning tasks
  vision: getChatModel("gpt-4.1"), // For image analysis
  fast: getChatModel("gpt-4.1-nano"), // For quick responses
  powerful: getChatModel("claude-4-sonnet-20250514"), // For complex tasks
  embedding: getEmbeddingModel("text-embedding-3-small"), // For embeddings
};

// Export model configurations for frontend
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