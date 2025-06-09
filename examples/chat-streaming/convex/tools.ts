import { z } from "zod";
import { ToolConfig, ToolCategory } from "./types";
import { ToolId } from "./config/agents";

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
});

// Tool registry with metadata (simplified)
export const toolConfigs: Record<string, ToolConfig> = {
  webSearch: {
    name: "Web Search",
    description: "Search the web for current information",
    category: "search",
    enabled: true,
    rateLimit: { requests: 10, window: 60 },
  },
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