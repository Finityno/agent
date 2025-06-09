import { z } from "zod";
import { AgentConfig, ModelId, EmbeddingModelId, ToolId } from "./types";

// Zod schema for agent configuration validation
const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.string(),
  chatModel: z.enum(["gpt-4.1", "gpt-4.1-nano", "claude-4-sonnet-20250514", "gemini-2.5-pro-preview-06-05", "gemini-2.5-flash-preview-05-20"]),
  embeddingModel: z.enum(["text-embedding-3-small", "text-embedding-3-large"]),
  tools: z.array(z.enum(["webSearch", "codeAnalysis", "dataVisualization", "documentSummary", "taskPlanning", "sentimentAnalysis"])),
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
  // General purpose chat agent
  chatAgent: {
    name: "Chat Assistant",
    description: "General purpose conversational AI assistant",
    instructions: "You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and helpful responses to user questions. Be conversational but professional.",
    chatModel: "gpt-4.1-nano",
    embeddingModel: "text-embedding-3-small",
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

  // Fast response agent
  fastAgent: {
    name: "Quick Assistant",
    description: "Optimized for fast responses and quick interactions",
    instructions: "You are a quick and efficient assistant. Provide concise, helpful responses. Focus on being fast and accurate while maintaining helpfulness.",
    chatModel: "gpt-4.1-nano",
    embeddingModel: "text-embedding-3-small",
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

// Get agent recommendations based on user input (simplified)
export function recommendAgent(userInput: string): keyof typeof agentConfigs {
  const validatedInput = z.string().parse(userInput);
  const input = validatedInput.toLowerCase();
  
  // Quick/simple requests
  if (input.includes("quick") || input.includes("simple") || input.includes("fast") || 
      input.length < 20) {
    return "fastAgent";
  }
  
  // Default to general chat agent
  return "chatAgent";
}

// Export agent configurations for frontend (simplified)
export function getAvailableAgents() {
  return Object.entries(agentConfigs).map(([key, config]) => {
    // Validate config with Zod before returning
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

// Get agent configuration by name
export function getAgentConfig(agentName: keyof typeof agentConfigs): AgentConfig {
  const config = agentConfigs[agentName];
  if (!config) {
    throw new Error(`Unknown agent: ${agentName}`);
  }
  return AgentConfigSchema.parse(config);
} 