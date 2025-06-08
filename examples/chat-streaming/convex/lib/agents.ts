import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { getChatModel, getEmbeddingModel } from "./models";
import { getEnabledTools } from "./tools";
import { AgentConfig, ModelId } from "./types";

// Predefined agent configurations
export const agentConfigs: Record<string, AgentConfig> = {
  // General purpose chat agent
  chatAgent: {
    name: "Chat Assistant",
    description: "General purpose conversational AI assistant",
    instructions: "You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and helpful responses to user questions. Be conversational but professional.",
    chatModel: "gpt-4.1",
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

  // Research and analysis agent
  researchAgent: {
    name: "Research Assistant",
    description: "Specialized in research, analysis, and information gathering",
    instructions: "You are a research specialist. Help users find, analyze, and synthesize information from various sources. Provide well-researched, accurate, and comprehensive responses with proper citations when possible.",
    chatModel: "claude-4-sonnet-20250514",
    embeddingModel: "text-embedding-3-large",
    tools: ["webSearch", "documentSummary", "sentimentAnalysis", "dataVisualization"],
    capabilities: {
      streaming: true,
      vision: true,
      reasoning: false,
      webSearch: true,
      codeAnalysis: false,
    },
    maxSteps: 5,
    maxRetries: 3,
    contextOptions: {
      includeToolCalls: true,
      recentMessages: 15,
      searchOptions: {
        limit: 10,
        textSearch: true,
        vectorSearch: true,
        messageRange: { before: 2, after: 1 },
      },
      searchOtherThreads: true,
    },
  },

  // Code development agent
  codeAgent: {
    name: "Code Assistant",
    description: "Specialized in software development, code analysis, and programming help",
    instructions: "You are a senior software engineer and coding mentor. Help users with programming questions, code review, debugging, and software architecture. Provide clear explanations, best practices, and working code examples.",
    chatModel: "gpt-4.1",
    embeddingModel: "text-embedding-3-small",
    tools: ["codeAnalysis", "documentSummary", "taskPlanning"],
    capabilities: {
      streaming: true,
      vision: true,
      reasoning: false,
      webSearch: false,
      codeAnalysis: true,
    },
    maxSteps: 4,
    maxRetries: 2,
    contextOptions: {
      includeToolCalls: true,
      recentMessages: 25,
      searchOptions: {
        limit: 8,
        textSearch: true,
        vectorSearch: true,
        messageRange: { before: 2, after: 2 },
      },
      searchOtherThreads: false,
    },
  },

  // Reasoning and problem-solving agent
  reasoningAgent: {
    name: "Reasoning Assistant",
    description: "Specialized in complex reasoning, problem-solving, and analytical thinking",
    instructions: "You are an expert in logical reasoning and problem-solving. Break down complex problems step by step, analyze different approaches, and provide well-reasoned solutions. Think through problems methodically and explain your reasoning process.",
    chatModel: "o1-mini",
    embeddingModel: "text-embedding-3-small",
    tools: ["taskPlanning", "documentSummary", "sentimentAnalysis"],
    capabilities: {
      streaming: false, // o1 models don't support streaming
      vision: false,
      reasoning: true,
      webSearch: false,
      codeAnalysis: false,
    },
    maxSteps: 1, // o1 models work best with single-step reasoning
    maxRetries: 1,
    contextOptions: {
      includeToolCalls: false,
      recentMessages: 10,
      searchOptions: {
        limit: 5,
        textSearch: false,
        vectorSearch: true,
        messageRange: { before: 1, after: 0 },
      },
      searchOtherThreads: false,
    },
  },

  // Creative writing agent
  creativeAgent: {
    name: "Creative Assistant",
    description: "Specialized in creative writing, storytelling, and content creation",
    instructions: "You are a creative writing expert and storyteller. Help users with creative writing, story development, character creation, and content generation. Be imaginative, engaging, and provide constructive feedback on creative works.",
    chatModel: "claude-4-sonnet-20250514",
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
      recentMessages: 30,
      searchOptions: {
        limit: 6,
        textSearch: true,
        vectorSearch: true,
        messageRange: { before: 3, after: 1 },
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
// Create agent instances
export function createAgent(agentType: keyof typeof agentConfigs) {
  const config: AgentConfig | undefined = agentConfigs[agentType];
  if (!config) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Get the configured models
  const chatModel = getChatModel(config.chatModel);
  const embeddingModel = getEmbeddingModel(config.embeddingModel);

  // Get the enabled tools based on the agent's configuration
  const tools = getEnabledTools(config.tools);

  return new Agent(components.agent, {
    name: config.name,
    chat: chatModel,
    textEmbedding: embeddingModel,
    instructions: config.instructions,
    tools,
    maxSteps: config.maxSteps,
    maxRetries: config.maxRetries,
    // Usage tracking
    usageHandler: async (ctx, args) => {
      const {
        userId,
        threadId,
        agentName,
        model,
        provider,
        usage,
        providerMetadata,
      } = args;
      
      // Log usage for monitoring and billing
      console.log(`Agent usage: ${agentName} (${model}) by ${userId}`, {
        threadId,
        provider,
        usage,
        timestamp: new Date().toISOString(),
      });
      
      // In a real implementation, you would save this to a database
      // for analytics, billing, and monitoring purposes
    },
  });
}

// Pre-created agent instances for common use cases
export const agents = {
  chat: createAgent("chatAgent"),
  research: createAgent("researchAgent"),
  code: createAgent("codeAgent"),
  reasoning: createAgent("reasoningAgent"),
  creative: createAgent("creativeAgent"),
  fast: createAgent("fastAgent"),
};

// Get agent by capability
export function getAgentByCapability(capability: keyof AgentConfig["capabilities"]) {
  const suitableAgents = Object.entries(agentConfigs)
    .filter(([_, config]) => config.capabilities[capability])
    .map(([name]) => name);
  
  if (suitableAgents.length === 0) {
    return agents.chat;
  }
  const agentKey = suitableAgents[0] as keyof typeof agents;
  return agents[agentKey];
}

// Get agent recommendations based on user input
export function recommendAgent(userInput: string): keyof typeof agents {
  const input = userInput.toLowerCase();
  
  // Code-related keywords
  if (input.includes("code") || input.includes("programming") || input.includes("debug") || 
      input.includes("function") || input.includes("algorithm") || input.includes("software")) {
    return "code";
  }
  
  // Research-related keywords
  if (input.includes("research") || input.includes("analyze") || input.includes("study") || 
      input.includes("investigate") || input.includes("find information") || input.includes("search")) {
    return "research";
  }
  
  // Reasoning-related keywords
  if (input.includes("solve") || input.includes("problem") || input.includes("logic") || 
      input.includes("reasoning") || input.includes("think through") || input.includes("complex")) {
    return "reasoning";
  }
  
  // Creative-related keywords
  if (input.includes("story") || input.includes("creative") || input.includes("write") || 
      input.includes("poem") || input.includes("character") || input.includes("narrative")) {
    return "creative";
  }
  
  // Quick/simple requests
  if (input.includes("quick") || input.includes("simple") || input.includes("fast") || 
      input.length < 20) {
    return "fast";
  }
  
  // Default to general chat agent
  return "chat";
}

// Export agent configurations for frontend
export function getAvailableAgents() {
  return Object.entries(agentConfigs).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    capabilities: config.capabilities,
    model: config.chatModel,
    tools: config.tools,
  }));
}

// Dynamic agent creation with custom configuration
export function createCustomAgent(
  customConfig: Partial<AgentConfig> & { name: string }
) {
  const baseConfig = agentConfigs.chatAgent; // Use chat agent as base
  const config: AgentConfig = {
    ...baseConfig,
    ...customConfig,
    // Ensure all required fields are present
    chatModel: customConfig.chatModel || baseConfig.chatModel,
    embeddingModel: customConfig.embeddingModel || baseConfig.embeddingModel,
    tools: customConfig.tools || baseConfig.tools,
  };

  const chatModel = getChatModel(config.chatModel);
  const embeddingModel = getEmbeddingModel(config.embeddingModel);

  const tools = getEnabledTools(config.tools);

  return new Agent(components.agent, {
    name: config.name,
    chat: chatModel,
    textEmbedding: embeddingModel,
    instructions: config.instructions,
    tools,
    maxSteps: config.maxSteps,
    maxRetries: config.maxRetries,
  });
}