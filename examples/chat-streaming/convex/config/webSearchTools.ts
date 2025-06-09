// Web search tools configuration for different AI providers
import { tool } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

// OpenAI Web Search Tool (using Responses API with webSearchPreview)
export const openaiWebSearchTool = {
  name: "web_search_preview",
  description: "Search the web for current information using OpenAI's web search preview",
  cost: "$10 per 1,000 searches",
  tool: openai.tools.webSearchPreview({
    // Optional configuration for better search results
    searchContextSize: "high" as const,
    userLocation: {
      type: "approximate" as const,
      city: "San Francisco",
      region: "California",
    },
  }),
  // Provider-specific configuration
  providerConfig: {
    requiresResponsesAPI: true,
    supportedModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-nano"],
    toolChoice: { type: "tool" as const, toolName: "web_search_preview" }, // To force web search
  },
};

// Anthropic Web Search Tool Configuration
// Note: Anthropic's web search is built into the Messages API for supported models
export const anthropicWebSearchConfig = {
  name: "web_search",
  description: "Search the web for current information using Anthropic's built-in web search",
  cost: "$10 per 1,000 searches plus standard token costs",
  // Anthropic automatically handles web search - no explicit tool needed
  supportedModels: [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-v2", 
    "claude-3-5-haiku"
  ],
  providerConfig: {
    maxUses: 5, // Limit the number of searches per conversation
    domainControls: {
      allowList: [], // Specify allowed domains if needed
      blockList: [], // Specify blocked domains if needed
    },
    organizationLevel: true, // Can be controlled at organization level
  },
};

// Google Web Search Tool Configuration (using Grounding with Google Search)
export const googleWebSearchConfig = {
  name: "google_search_grounding",
  description: "Ground responses with Google Search for current information",
  cost: "$35 per 1,000 grounded queries",
  supportedModels: [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ],
  providerConfig: {
    useSearchGrounding: true,
    dynamicRetrieval: {
      threshold: 0.3, // 0 = always ground, 1 = never ground
    },
    // For Gemini 2.0+, search is available as a tool
    searchAsTool: {
      enabled: true,
      toolName: "google_search",
    },
  },
};

// Generic web search tool for custom implementations
export const genericWebSearchTool = tool({
  description: "Search the web for current, up-to-date information",
  parameters: z.object({
    query: z.string().min(1).max(200).describe("The search query"),
    maxResults: z.number().min(1).max(10).default(5).describe("Maximum number of results to return"),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    // This is a placeholder implementation
    // In a real scenario, you would integrate with a search API like:
    // - Exa (https://exa.ai)
    // - Bing Search API
    // - Google Custom Search API
    // - Serper API
    // - Tavily API
    
    console.log(`Searching for: ${query} (max results: ${maxResults})`);
    
    // Mock response for demonstration
    return {
      query,
      results: [
        {
          title: `Search result for: ${query}`,
          url: "https://example.com",
          snippet: `This is a mock search result for the query: ${query}. In a real implementation, this would contain actual search results from a search API.`,
          publishedDate: new Date().toISOString(),
        },
      ],
      searchMetadata: {
        totalResults: 1,
        searchTime: 0.1,
        timestamp: new Date().toISOString(),
      },
    };
  },
});

// Web search tool registry
export const webSearchTools = {
  openai: openaiWebSearchTool,
  anthropic: anthropicWebSearchConfig,
  google: googleWebSearchConfig,
  generic: genericWebSearchTool,
} as const;

// Helper function to get web search tool for a specific provider
export function getWebSearchTool(provider: "openai" | "anthropic" | "google" | "generic") {
  return webSearchTools[provider];
}

// Helper function to check if web search is supported for a provider
export function isWebSearchSupported(provider: string): boolean {
  return ["openai", "anthropic", "google"].includes(provider);
}

// Helper function to get web search cost for a provider
export function getWebSearchCost(provider: "openai" | "anthropic" | "google"): string {
  switch (provider) {
    case "openai":
      return "$10 per 1,000 searches";
    case "anthropic":
      return "$10 per 1,000 searches plus standard token costs";
    case "google":
      return "$35 per 1,000 grounded queries";
    default:
      return "Cost varies by provider";
  }
}

// Configuration for web search settings
export interface WebSearchConfig {
  enabled: boolean;
  provider: "openai" | "anthropic" | "google" | "generic";
  maxSearches?: number;
  searchTimeout?: number;
  customSettings?: Record<string, any>;
}

// Default web search configurations for each provider
export const defaultWebSearchConfigs: Record<string, WebSearchConfig> = {
  openai: {
    enabled: true,
    provider: "openai",
    maxSearches: 5,
    searchTimeout: 30000,
    customSettings: {
      searchContextSize: "high",
      userLocation: {
        type: "approximate",
        city: "San Francisco", 
        region: "California",
      },
      requiresResponsesAPI: true,
    },
  },
  anthropic: {
    enabled: true,
    provider: "anthropic",
    maxSearches: 5,
    searchTimeout: 30000,
    customSettings: {
      maxUses: 5,
      domainControls: {
        allowList: [],
        blockList: [],
      },
    },
  },
  google: {
    enabled: true,
    provider: "google",
    maxSearches: 5,
    searchTimeout: 30000,
    customSettings: {
      useSearchGrounding: true,
      dynamicRetrieval: {
        threshold: 0.3,
      },
      searchAsTool: {
        enabled: true,
      },
    },
  },
  generic: {
    enabled: false, // Disabled by default since it requires external API setup
    provider: "generic",
    maxSearches: 5,
    searchTimeout: 30000,
  },
}; 