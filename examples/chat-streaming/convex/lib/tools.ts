import { createTool } from "@convex-dev/agent";
import { tool } from "ai";
import { z } from "zod";
import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

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

// Tool registry with metadata
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

// Web Search Tool
export const webSearchTool = createTool({
  description: "Search the web for current information and real-time data",
  args: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().default(5).describe("Maximum number of results to return"),
    timeRange: z.enum(["day", "week", "month", "year", "all"]).optional().default("all"),
  }),
  handler: async (ctx, args): Promise<Array<{
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
  }>> => {
    // In a real implementation, you would integrate with a search API
    // like Google Custom Search, Bing Search API, or Perplexity API
    console.log(`Searching for: ${args.query}`);
    
    // Mock search results for demonstration
    return [
      {
        title: `Search results for: ${args.query}`,
        url: "https://example.com",
        snippet: "This is a mock search result. In a real implementation, this would return actual web search results.",
        publishedDate: new Date().toISOString(),
      },
    ];
  },
});

// Code Analysis Tool
export const codeAnalysisTool = createTool({
  description: "Analyze code snippets, explain functionality, and suggest improvements",
  args: z.object({
    code: z.string().describe("The code to analyze"),
    language: z.string().optional().describe("Programming language (auto-detected if not provided)"),
    analysisType: z.enum(["explain", "review", "optimize", "debug"]).default("explain"),
  }),
  handler: async (ctx, args): Promise<{
    language: string;
    analysis: string;
    suggestions: string[];
    complexity: "low" | "medium" | "high";
  }> => {
    // In a real implementation, you would use static analysis tools
    // or integrate with code analysis services
    
    const detectedLanguage = args.language || detectLanguage(args.code);
    
    return {
      language: detectedLanguage,
      analysis: `This ${detectedLanguage} code appears to ${args.analysisType === "explain" ? "implement basic functionality" : "need review"}`,
      suggestions: [
        "Consider adding error handling",
        "Add type annotations for better maintainability",
        "Consider breaking down complex functions",
      ],
      complexity: "medium",
    };
  },
});

// Document Summary Tool
export const documentSummaryTool = createTool({
  description: "Summarize long documents, articles, or text content",
  args: z.object({
    content: z.string().describe("The content to summarize"),
    summaryLength: z.enum(["brief", "medium", "detailed"]).default("medium"),
    focusAreas: z.array(z.string()).optional().describe("Specific areas to focus on in the summary"),
  }),
  handler: async (ctx, args): Promise<{
    summary: string;
    keyPoints: string[];
    wordCount: { original: number; summary: number };
  }> => {
    const originalWordCount = args.content.split(/\s+/).length;
    
    // In a real implementation, you would use NLP libraries or AI models
    // to generate intelligent summaries
    
    const summaryLength = {
      brief: Math.max(50, Math.floor(originalWordCount * 0.1)),
      medium: Math.max(100, Math.floor(originalWordCount * 0.2)),
      detailed: Math.max(200, Math.floor(originalWordCount * 0.3)),
    }[args.summaryLength];
    
    const words = args.content.split(/\s+/);
    const summary = words.slice(0, summaryLength).join(" ") + "...";
    
    return {
      summary,
      keyPoints: [
        "Main topic identified",
        "Key arguments extracted",
        "Important conclusions noted",
      ],
      wordCount: {
        original: originalWordCount,
        summary: summary.split(/\s+/).length,
      },
    };
  },
});

// Task Planning Tool
export const taskPlanningTool = createTool({
  description: "Break down complex tasks into manageable steps with timelines",
  args: z.object({
    task: z.string().describe("The main task to break down"),
    complexity: z.enum(["simple", "medium", "complex"]).default("medium"),
    timeframe: z.string().optional().describe("Desired completion timeframe"),
    resources: z.array(z.string()).optional().describe("Available resources"),
  }),
  handler: async (ctx, args): Promise<{
    steps: Array<{
      id: number;
      title: string;
      description: string;
      estimatedTime: string;
      dependencies: number[];
      priority: "low" | "medium" | "high";
    }>;
    totalEstimatedTime: string;
    criticalPath: number[];
  }> => {
    // In a real implementation, you would use project management algorithms
    // and AI to generate intelligent task breakdowns
    
    const stepCount = {
      simple: 3,
      medium: 5,
      complex: 8,
    }[args.complexity];
    
    const steps = Array.from({ length: stepCount }, (_, i) => ({
      id: i + 1,
      title: `Step ${i + 1}: ${args.task} - Phase ${i + 1}`,
      description: `Detailed description for step ${i + 1} of the task breakdown`,
      estimatedTime: `${Math.floor(Math.random() * 4) + 1} hours`,
      dependencies: i > 0 ? [i] : [],
      priority: (["low", "medium", "high"] as const)[Math.floor(Math.random() * 3)],
    }));
    
    return {
      steps,
      totalEstimatedTime: `${stepCount * 2} hours`,
      criticalPath: steps.map(s => s.id),
    };
  },
});

// Sentiment Analysis Tool
export const sentimentAnalysisTool = createTool({
  description: "Analyze sentiment, emotions, and tone in text content",
  args: z.object({
    text: z.string().describe("The text to analyze"),
    analysisDepth: z.enum(["basic", "detailed", "comprehensive"]).default("basic"),
    includeEmotions: z.boolean().default(false),
  }),
  handler: async (ctx, args): Promise<{
    sentiment: "positive" | "negative" | "neutral";
    confidence: number;
    emotions?: Array<{ emotion: string; intensity: number }>;
    tone: string;
    subjectivity: number;
  }> => {
    // In a real implementation, you would use sentiment analysis APIs
    // like Google Cloud Natural Language, AWS Comprehend, or Azure Text Analytics
    
    const words = args.text.toLowerCase().split(/\s+/);
    const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "fantastic"];
    const negativeWords = ["bad", "terrible", "awful", "horrible", "disappointing"];
    
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let sentiment: "positive" | "negative" | "neutral";
    let confidence: number;
    
    if (positiveCount > negativeCount) {
      sentiment = "positive";
      confidence = Math.min(0.9, 0.5 + (positiveCount - negativeCount) * 0.1);
    } else if (negativeCount > positiveCount) {
      sentiment = "negative";
      confidence = Math.min(0.9, 0.5 + (negativeCount - positiveCount) * 0.1);
    } else {
      sentiment = "neutral";
      confidence = 0.6;
    }
    
    const result: any = {
      sentiment,
      confidence,
      tone: sentiment === "positive" ? "optimistic" : sentiment === "negative" ? "pessimistic" : "neutral",
      subjectivity: Math.random() * 0.5 + 0.25, // Mock subjectivity score
    };
    
    if (args.includeEmotions) {
      result.emotions = [
        { emotion: "joy", intensity: sentiment === "positive" ? 0.7 : 0.2 },
        { emotion: "sadness", intensity: sentiment === "negative" ? 0.6 : 0.1 },
        { emotion: "anger", intensity: negativeCount > 2 ? 0.5 : 0.1 },
        { emotion: "surprise", intensity: Math.random() * 0.3 },
      ];
    }
    
    return result;
  },
});

// Data Visualization Tool
export const dataVisualizationTool = createTool({
  description: "Create charts and visualizations from data",
  args: z.object({
    data: z.array(z.record(z.any())).describe("Array of data objects"),
    chartType: z.enum(["bar", "line", "pie", "scatter", "histogram"]).describe("Type of chart to create"),
    xAxis: z.string().describe("Field name for X-axis"),
    yAxis: z.string().describe("Field name for Y-axis"),
    title: z.string().optional().describe("Chart title"),
  }),
  handler: async (ctx, args): Promise<{
    chartConfig: any;
    dataPoints: number;
    insights: string[];
    downloadUrl?: string;
  }> => {
    // In a real implementation, you would generate actual charts
    // using libraries like D3.js, Chart.js, or integrate with services like QuickChart
    
    return {
      chartConfig: {
        type: args.chartType,
        data: {
          labels: args.data.map((item, index) => item[args.xAxis] || `Point ${index + 1}`),
          datasets: [{
            label: args.yAxis,
            data: args.data.map(item => item[args.yAxis] || 0),
          }],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: !!args.title,
              text: args.title,
            },
          },
        },
      },
      dataPoints: args.data.length,
      insights: [
        `Dataset contains ${args.data.length} data points`,
        `Chart type: ${args.chartType}`,
        `X-axis represents: ${args.xAxis}`,
        `Y-axis represents: ${args.yAxis}`,
      ],
    };
  },
});

// Helper function to detect programming language
function detectLanguage(code: string): string {
  if (code.includes("function") && code.includes("=>")) return "javascript";
  if (code.includes("def ") && code.includes(":")) return "python";
  if (code.includes("public class") || code.includes("import java")) return "java";
  if (code.includes("#include") || code.includes("int main")) return "c++";
  if (code.includes("fn ") && code.includes("->")) return "rust";
  if (code.includes("func ") && code.includes("package")) return "go";
  return "unknown";
}

// Export all tools as a collection
export const availableTools = {
  webSearch: webSearchTool,
  codeAnalysis: codeAnalysisTool,
  documentSummary: documentSummaryTool,
  taskPlanning: taskPlanningTool,
  sentimentAnalysis: sentimentAnalysisTool,
  dataVisualization: dataVisualizationTool,
};

// Get tools by category
export function getToolsByCategory(category: ToolCategory) {
  return Object.entries(toolConfigs)
    .filter(([_, config]) => config.category === category && config.enabled)
    .map(([name]) => name);
}

// Get enabled tools
export function getEnabledTools() {
  return Object.entries(toolConfigs)
    .filter(([_, config]) => config.enabled)
    .reduce((acc, [name, _]) => {
      if (availableTools[name as keyof typeof availableTools]) {
        acc[name] = availableTools[name as keyof typeof availableTools];
      }
      return acc;
    }, {} as Record<string, any>);
}

// Tool usage tracking
export async function trackToolUsage(
  ctx: ActionCtx,
  toolName: string,
  userId: string,
  success: boolean,
  executionTime: number
) {
  // In a real implementation, you would save this to a database
  console.log(`Tool usage: ${toolName} by ${userId}, success: ${success}, time: ${executionTime}ms`);
} 