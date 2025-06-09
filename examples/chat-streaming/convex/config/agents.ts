// Agent configurations using centralized model definitions
import { z } from "zod";
import { ModelId, EmbeddingModelId, DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL } from "./models";

// Tool IDs - centralized here
export const ToolId = z.enum([
  "webSearch",
  "codeAnalysis", 
  "dataVisualization",
  "documentSummary",
  "taskPlanning",
  "sentimentAnalysis"
]);
export type ToolId = z.infer<typeof ToolId>;

// Agent configuration interface
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

// Validation schema using centralized enums
export const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  chatModel: ModelId,
  embeddingModel: EmbeddingModelId,
  tools: z.array(ToolId),
  capabilities: z.object({
    streaming: z.boolean(),
    vision: z.boolean(),
    reasoning: z.boolean(),
    webSearch: z.boolean(),
    codeAnalysis: z.boolean(),
  }),
  maxSteps: z.number(),
  maxRetries: z.number(),
  contextOptions: z.object({
    includeToolCalls: z.boolean(),
    recentMessages: z.number(),
    searchOptions: z.object({
      limit: z.number(),
      textSearch: z.boolean(),
      vectorSearch: z.boolean(),
      messageRange: z.object({ before: z.number(), after: z.number() }),
    }),
    searchOtherThreads: z.boolean(),
  }).optional(),
});

// Predefined agent configurations
export const agentConfigs: Record<string, AgentConfig> = {
  chatAgent: {
    name: "Chat Assistant",
    description: "General purpose conversational AI assistant",
    instructions: "You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and helpful responses to user questions. Be conversational but professional.",
    chatModel: DEFAULT_CHAT_MODEL,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    tools: ["sentimentAnalysis", "documentSummary"],
    capabilities: {
      streaming: true,
      vision: true,
      reasoning: false,
      webSearch: false,
      codeAnalysis: false,
    },
    maxSteps: 3,
    maxRetries: 2,
    contextOptions: {
      includeToolCalls: false,
      recentMessages: 20,
      searchOptions: {
        limit: 5,
        textSearch: true,
        vectorSearch: true,
        messageRange: { before: 1, after: 1 },
      },
      searchOtherThreads: false,
    },
  },

  fastAgent: {
    name: "Quick Assistant", 
    description: "Optimized for fast responses and quick interactions",
    instructions: "You are a quick and efficient assistant. Provide concise, helpful responses. Focus on being fast and accurate while maintaining helpfulness.",
    chatModel: DEFAULT_CHAT_MODEL,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    tools: [],
    capabilities: {
      streaming: true,
      vision: false,
      reasoning: false,
      webSearch: false,
      codeAnalysis: false,
    },
    maxSteps: 1,
    maxRetries: 1,
    contextOptions: {
      includeToolCalls: false,
      recentMessages: 10,
      searchOptions: {
        limit: 3,
        textSearch: false,
        vectorSearch: false,
        messageRange: { before: 0, after: 0 },
      },
      searchOtherThreads: false,
    },
  },
};

// Utility functions
export function getAgentConfig(agentName: keyof typeof agentConfigs): AgentConfig {
  const config = agentConfigs[agentName];
  if (!config) {
    throw new Error(`Unknown agent: ${agentName}`);
  }
  return AgentConfigSchema.parse(config);
}

export function getAvailableAgents() {
  return Object.entries(agentConfigs).map(([key, config]) => {
    const validatedConfig = AgentConfigSchema.parse(config);
    return {
      id: key,
      name: validatedConfig.name,
      description: validatedConfig.description,
      capabilities: validatedConfig.capabilities,
      model: validatedConfig.chatModel,
      tools: validatedConfig.tools,
    };
  });
}

export function recommendAgent(userInput: string): keyof typeof agentConfigs {
  const input = userInput.toLowerCase();
  
  // Quick/simple requests
  if (input.includes("quick") || input.includes("simple") || input.includes("fast") || 
      input.length < 20) {
    return "fastAgent";
  }
  
  // Default to general chat agent
  return "chatAgent";
} 