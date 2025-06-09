// Centralized AI provider management with web search support
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { ModelId, ModelProvider, getModelConfig } from "./models";
import { 
  getWebSearchTool, 
  isWebSearchSupported as isWebSearchSupportedInternal,
  defaultWebSearchConfigs,
  WebSearchConfig 
} from "./webSearchTools";

// Re-export for external use
export const isWebSearchSupported = isWebSearchSupportedInternal;

// Provider configurations
export const providers = {
  openai: openai,
  anthropic: anthropic,
  google: google,
  // Custom OpenAI-compatible providers
  groq: createOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  }),
  perplexity: createOpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: "https://api.perplexity.ai",
  }),
} as const;

// Options for creating model instances with web search
export interface ModelInstanceOptions {
  enableWebSearch?: boolean;
  webSearchConfig?: Partial<WebSearchConfig>;
}

// Get the correct provider and model instance for a given model ID
export function createModelInstance(modelId: ModelId, options: ModelInstanceOptions = {}) {
  const config = getModelConfig(modelId);
  const { enableWebSearch = false, webSearchConfig } = options;
  
  switch (config.provider) {
    case "openai":
      // For OpenAI, we use the Responses API for web search
      if (enableWebSearch) {
        return providers.openai.responses(modelId);
      }
      return providers.openai(modelId);
      
    case "anthropic":
      // For Anthropic, web search is enabled via API configuration
      // The web search tool is automatically available when using supported models
      return providers.anthropic(modelId);
      
    case "google":
      // For Google, we can enable search grounding
      if (enableWebSearch) {
        const searchConfig = { 
          ...defaultWebSearchConfigs.google.customSettings,
          ...webSearchConfig?.customSettings 
        };
        return providers.google(modelId, {
          useSearchGrounding: searchConfig.useSearchGrounding,
          ...searchConfig.dynamicRetrieval && { 
            dynamicRetrieval: searchConfig.dynamicRetrieval 
          },
        });
      }
      return providers.google(modelId);
      
    case "groq":
      return providers.groq(modelId);
      
    case "perplexity":
      // Perplexity has built-in web search capabilities
      return providers.perplexity(modelId);
      
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// Get web search tools for a specific provider
export function getProviderWebSearchTools(provider: ModelProvider) {
  if (!isWebSearchSupportedInternal(provider)) {
    return null;
  }
  
  switch (provider) {
    case "openai":
      const openaiTool = getWebSearchTool("openai");
      // OpenAI tool has a .tool property containing the actual webSearchPreview tool
      if ('tool' in openaiTool) {
        return {
          web_search_preview: openaiTool.tool,
        };
      }
      return null;
      
    case "anthropic":
      // Anthropic's web search is handled automatically by the API
      // No explicit tools needed - it's enabled by default for supported models
      // The web search happens automatically when Claude determines it's needed
      return null;
      
    case "google":
      // Google's search grounding is handled via model configuration
      // For Gemini 2.0+, search can also be available as a tool
      const googleConfig = getWebSearchTool("google");
      if (provider === "google" && 'providerConfig' in googleConfig && 
          googleConfig.providerConfig && 
          'searchAsTool' in googleConfig.providerConfig &&
          googleConfig.providerConfig.searchAsTool?.enabled) {
        // For Gemini 2.0+, search as a tool
        return {
          google_search: {
            type: "function",
            function: {
              name: "google_search",
              description: "Search the web using Google Search",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "The search query"
                  }
                },
                required: ["query"]
              }
            }
          }
        };
      }
      return null;
      
    default:
      return null;
  }
}

// Check if a model supports web search
export function modelSupportsWebSearch(modelId: ModelId): boolean {
  const config = getModelConfig(modelId);
  
  // Check if the provider supports web search
  if (!isWebSearchSupportedInternal(config.provider)) {
    return false;
  }
  
  // Provider-specific model support checks based on research
  switch (config.provider) {
    case "openai":
      // OpenAI web search is available for Responses API models
      // Based on research, supported for gpt-4o-mini and other models
      const openaiSupportedModels = ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-nano"];
      return openaiSupportedModels.includes(modelId);
      
    case "anthropic":
      // Anthropic web search is available for specific Claude models
      // Based on research: Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Claude 3.5 Haiku
      const anthropicSupportedModels = [
        "claude-3-7-sonnet-20250219",
        "claude-3-5-sonnet-v2", 
        "claude-3-5-haiku",
        "claude-4-sonnet-20250514" // Update based on actual supported models
      ];
      return anthropicSupportedModels.includes(modelId);
      
    case "google":
      // Google search grounding is available for Gemini 1.5+ models
      // Based on research: Gemini 1.5 and 2.0+ models support grounding
      const googleSupportedModels = [
        "gemini-1.5-flash",
        "gemini-1.5-pro", 
        "gemini-2.0-flash",
        "gemini-2.5-flash-preview-05-20",
        "gemini-2.5-pro-preview-06-05"
      ];
      return googleSupportedModels.includes(modelId);
      
    default:
      return false;
  }
}

// Get web search configuration for a provider
export function getProviderWebSearchConfig(provider: ModelProvider): WebSearchConfig | null {
  return defaultWebSearchConfigs[provider] || null;
}

// Create model instance with automatic web search detection
export function createModelInstanceWithAutoWebSearch(modelId: ModelId): {
  model: any;
  webSearchEnabled: boolean;
  webSearchTools?: Record<string, any>;
} {
  const supportsWebSearch = modelSupportsWebSearch(modelId);
  const config = getModelConfig(modelId);
  
  if (supportsWebSearch) {
    const model = createModelInstance(modelId, { enableWebSearch: true });
    const webSearchTools = getProviderWebSearchTools(config.provider);
    
    return {
      model,
      webSearchEnabled: true,
      webSearchTools: webSearchTools || undefined,
    };
  }
  
  return {
    model: createModelInstance(modelId),
    webSearchEnabled: false,
  };
}

// Get embedding model instance (currently only OpenAI supported)
export function createEmbeddingInstance(modelId: string) {
  return providers.openai.textEmbedding(modelId);
} 