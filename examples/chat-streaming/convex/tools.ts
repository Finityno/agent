import { z } from "zod";
import { ToolConfig, ToolCategory } from "./types";
import { ToolId } from "./config/agents";
import { 
  isWebSearchSupported, 
  modelSupportsWebSearch, 
  getProviderWebSearchConfig 
} from "./config/providers";
import { ModelId, ModelProvider } from "./config/models";

// Zod schemas for tool validation
const ToolConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.enum(["search", "analysis", "productivity", "development", "communication", "data"]),
  enabled: z.boolean(),
  requiresAuth: z.boolean().optional(),
  rateLimit: z.object({
    requests: z.number(),
    window: z.number(),
  }).optional(),
  providers: z.array(z.string()).optional(),
  cost: z.string().optional(),
  supportedModels: z.array(z.string()).optional(),
});

// Tool registry with metadata (enhanced with comprehensive web search support)
export const toolConfigs: Record<string, ToolConfig & { 
  providers?: string[]; 
  cost?: string; 
  supportedModels?: string[] 
}> = {
  // OpenAI Web Search Tools
  openaiWebSearch: {
    name: "OpenAI Web Search",
    description: "Search the web for current information using OpenAI's Responses API with web search preview",
    category: "search",
    enabled: true,
    rateLimit: { requests: 10, window: 60 },
    providers: ["openai"],
    cost: "$10 per 1,000 searches",
    supportedModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-nano"],
  },
  
  // Anthropic Web Search Tools
  anthropicWebSearch: {
    name: "Anthropic Web Search",
    description: "Search the web for current information using Anthropic's built-in web search capabilities",
    category: "search",
    enabled: true,
    rateLimit: { requests: 10, window: 60 },
    providers: ["anthropic"],
    cost: "$10 per 1,000 searches plus standard token costs",
    supportedModels: [
      "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-v2", 
      "claude-3-5-haiku",
      "claude-4-sonnet-20250514"
    ],
  },
  
  // Google Search Grounding Tools
  googleSearchGrounding: {
    name: "Google Search Grounding",
    description: "Ground responses with Google Search for current information using dynamic retrieval",
    category: "search",
    enabled: true,
    rateLimit: { requests: 10, window: 60 },
    providers: ["google"],
    cost: "$35 per 1,000 grounded queries",
    supportedModels: [
      "gemini-1.5-flash",
      "gemini-1.5-pro", 
      "gemini-2.0-flash",
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.5-pro-preview-06-05"
    ],
  },
  
  // Generic Web Search (for custom implementations)
  webSearch: {
    name: "Generic Web Search",
    description: "Search the web for current information using external search APIs (requires configuration)",
    category: "search",
    enabled: false, // Disabled by default as it requires external API setup
    rateLimit: { requests: 10, window: 60 },
    providers: ["generic"],
    cost: "Varies by search API provider",
  },
  
  // Existing tools (unchanged)
  codeAnalysis: {
    name: "Code Analysis",
    description: "Analyze and explain code snippets",
    category: "development",
    enabled: true,
  },
  dataVisualization: {
    name: "Data Visualization",
    description: "Create charts and graphs from data",
    category: "data",
    enabled: true,
  },
  documentSummary: {
    name: "Document Summary",
    description: "Summarize long documents or articles",
    category: "productivity",
    enabled: true,
  },
  taskPlanning: {
    name: "Task Planning",
    description: "Break down complex tasks into steps",
    category: "productivity",
    enabled: true,
  },
  sentimentAnalysis: {
    name: "Sentiment Analysis",
    description: "Analyze sentiment and emotions in text",
    category: "analysis",
    enabled: true,
  },
};

// Get tools by category
export function getToolsByCategory(category: ToolCategory): string[] {
  const validatedCategory = z.enum(["search", "analysis", "productivity", "development", "communication", "data"]).parse(category);
  
  return Object.entries(toolConfigs)
    .filter(([_, config]) => {
      // Validate each config with Zod
      const validatedConfig = ToolConfigSchema.parse(config);
      return validatedConfig.category === validatedCategory && validatedConfig.enabled;
    })
    .map(([name]) => name);
}

// Get enabled tools (simplified)
export function getEnabledTools(toolNames: string[]): string[] {
  const validatedToolNames = z.array(z.string()).parse(toolNames);
  
  return validatedToolNames.filter((name) => {
    const config = toolConfigs[name];
    if (!config) return false;
    const validatedConfig = ToolConfigSchema.parse(config);
    return validatedConfig.enabled;
  });
}

// Get all available tool names
export function getAvailableToolNames(): string[] {
  return Object.keys(toolConfigs).filter(name => {
    const config = toolConfigs[name];
    const validatedConfig = ToolConfigSchema.parse(config);
    return validatedConfig.enabled;
  });
}

// Get tool configuration by name
export function getToolConfig(toolName: string): ToolConfig | null {
  const validatedToolName = z.string().parse(toolName);
  const config = toolConfigs[validatedToolName];
  if (!config) return null;
  return ToolConfigSchema.parse(config);
}

// Check if a tool is enabled
export function isToolEnabled(toolName: string): boolean {
  const config = getToolConfig(toolName);
  return config ? config.enabled : false;
}

// Get web search tools for a specific provider
export function getWebSearchToolsForProvider(provider: ModelProvider): string[] {
  return Object.entries(toolConfigs)
    .filter(([_, config]) => {
      const validatedConfig = ToolConfigSchema.parse(config);
      return (
        validatedConfig.category === "search" &&
        validatedConfig.enabled &&
        config.providers?.includes(provider)
      );
    })
    .map(([name]) => name);
}

// Check if web search tools are available for a model
export function hasWebSearchTools(modelId: ModelId): boolean {
  return modelSupportsWebSearch(modelId);
}

// Get all web search related tools with their configurations
export function getAllWebSearchTools(): Array<{ 
  name: string; 
  config: ToolConfig & { 
    providers?: string[]; 
    cost?: string; 
    supportedModels?: string[] 
  } 
}> {
  return Object.entries(toolConfigs)
    .filter(([_, config]) => {
      const validatedConfig = ToolConfigSchema.parse(config);
      return validatedConfig.category === "search";
    })
    .map(([name, config]) => ({ name, config }));
}

// Get available web search tools for a specific model
export function getAvailableWebSearchToolsForModel(modelId: ModelId): Array<{
  name: string;
  config: ToolConfig & { providers?: string[]; cost?: string; supportedModels?: string[] }
}> {
  return getAllWebSearchTools().filter(({ config }) => {
    if (!config.supportedModels) return false;
    return config.supportedModels.includes(modelId);
  });
}

// Get web search tool cost for a provider
export function getWebSearchToolCost(provider: ModelProvider): string | null {
  const tools = getWebSearchToolsForProvider(provider);
  if (tools.length === 0) return null;
  
  const toolConfig = toolConfigs[tools[0]];
  return toolConfig?.cost || null;
} 