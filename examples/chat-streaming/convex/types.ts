// Re-export centralized types from config
export type { 
  ModelId, 
  EmbeddingModelId, 
  ModelProvider,
  ModelConfig 
} from "./config/models";

export type { 
  ToolId,
  AgentConfig 
} from "./config/agents";

// Tool category types
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