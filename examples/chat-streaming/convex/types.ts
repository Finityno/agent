// Type definitions for models, tools, and agent configurations
// Type definitions for model and tool identifiers
export type ModelId =
  | "gpt-4o-mini"
  | "gpt-4o";

export type EmbeddingModelId =
  | "text-embedding-3-small"
  | "text-embedding-3-large";

export type ToolId =
  | "webSearch"
  | "codeAnalysis"
  | "dataVisualization"
  | "documentSummary"
  | "taskPlanning"
  | "sentimentAnalysis";

// Model definitions with metadata
export interface ModelConfig {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "groq" | "perplexity";
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

// Tool categories for organization
export type ToolCategory =
  | "search"
  | "analysis"
  | "productivity"
  | "development"
  | "communication"
  | "data";

export interface ToolConfig {
  name: string;
  description: string;
  category: ToolCategory;
  enabled: boolean;
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
}

// Agent configuration interface with strong types
export interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  chatModel: ModelId;
  embeddingModel: EmbeddingModelId;
  tools: ToolId[];
  capabilities: {
    streaming: boolean;
    vision: boolean;
    reasoning: boolean;
    webSearch: boolean;
    codeAnalysis: boolean;
  };
  maxSteps: number;
  maxRetries: number;
  contextOptions?: {
    includeToolCalls: boolean;
    recentMessages: number;
    searchOptions: {
      limit: number;
      textSearch: boolean;
      vectorSearch: boolean;
      messageRange: { before: number; after: number };
    };
    searchOtherThreads: boolean;
  };
} 