# Enhanced Models and Tools System

This document describes the comprehensive improvements made to the models and tools system in the Convex Agent chat application.

## Overview

The system has been completely redesigned to provide:
- **Multi-provider model support** (OpenAI, Anthropic, Google, Groq, Perplexity)
- **Comprehensive tool ecosystem** with categorized capabilities
- **Intelligent agent selection** based on user input
- **Dynamic model switching** during conversations
- **Usage tracking and analytics**
- **Extensible architecture** for easy additions

## Architecture

### 1. Models System (`convex/lib/models.ts`)

#### Supported Providers
- **OpenAI**: GPT-4.1, GPT-4.1 Nano, o1-preview, o1-mini
- **Anthropic**: Claude 4 Sonnet (latest)
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash (latest previews)
- **Groq**: Llama 3.3 70B (fast inference)
- **Perplexity**: Sonar Large Online (search-enhanced)

#### Model Configuration
Each model includes:
```typescript
interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  maxTokens: number;
  pricing: { input: number; output: number };
  capabilities: {
    chat: boolean;
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    reasoning: boolean;
  };
  category: "fast" | "balanced" | "powerful" | "reasoning";
}
```

#### Usage Examples
```typescript
// Get a specific model
const model = getChatModel("gpt-4o-mini");

// Get models by category
const fastModels = getModelsByCategory("fast");

// Get models by capability
const visionModels = getModelsByCapability("vision");
```

### 2. Tools System (`convex/lib/tools.ts`)

#### Available Tools
- **Web Search**: Real-time information retrieval
- **Code Analysis**: Code explanation, review, and optimization
- **Document Summary**: Intelligent text summarization
- **Task Planning**: Complex task breakdown with timelines
- **Sentiment Analysis**: Emotion and tone analysis
- **Data Visualization**: Chart and graph generation

#### Tool Categories
- `search`: Information retrieval tools
- `analysis`: Data and content analysis tools
- `productivity`: Task management and planning tools
- `development`: Code-related tools
- `communication`: Messaging and collaboration tools
- `data`: Data processing and visualization tools

#### Tool Configuration
```typescript
interface ToolConfig {
  name: string;
  description: string;
  category: ToolCategory;
  enabled: boolean;
  requiresAuth?: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
}
```

### 3. Agent System (`convex/lib/agents.ts`)

#### Predefined Agents
- **Quick Assistant**: Fast responses for simple queries (DEFAULT)
- **Chat Assistant**: General purpose conversational AI
- **Research Assistant**: Specialized in research and analysis
- **Code Assistant**: Software development and programming help
- **Reasoning Assistant**: Complex problem-solving and logic
- **Creative Assistant**: Writing and content creation

#### Agent Configuration
```typescript
interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  chatModel: string;
  embeddingModel: string;
  tools: string[];
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
    searchOptions: object;
    searchOtherThreads: boolean;
  };
}
```

## API Functions

### Model Management
```typescript
// Get available models
export const getAvailableModelsQuery = query({
  args: {},
  handler: async (ctx) => {
    return getAvailableModels();
  },
});

// Send message with specific model
export const sendMessageWithModel = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    modelId: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Agent Management
```typescript
// Get available agents
export const getAvailableAgentsQuery = query({
  args: {},
  handler: async (ctx) => {
    return getAvailableAgents();
  },
});

// Send message with intelligent agent selection
export const sendMessageWithSmartAgent = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

### Usage Analytics
```typescript
// Get model usage statistics
export const getModelUsageStats = query({
  args: {
    timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    // Returns usage statistics
  },
});
```

## Environment Setup

### Required Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Groq (optional)
GROQ_API_KEY=your_groq_api_key

# Perplexity (optional)
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### Installation
```bash
# Install required AI SDK packages
npm install @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google

# Install Convex Agent
npm install @convex-dev/agent

# Install additional dependencies
npm install zod uuid
```

## Usage Examples

### 1. Basic Model Selection
```typescript
// Frontend: Select a model in the UI
const selectedModel = "gpt-4.1"; // Default latest model

// Send message with selected model
await sendMessage.mutate({
  threadId,
  prompt: userInput,
  modelId: selectedModel,
});
```

### 2. Intelligent Agent Selection
```typescript
// Backend automatically selects the best agent
const agentType = recommendAgent("Help me debug this Python code");
// Returns: "code" (Code Assistant)

const agentType2 = recommendAgent("Write a creative story about space");
// Returns: "creative" (Creative Assistant)
```

### 3. Custom Agent Creation
```typescript
// Create a specialized agent
const customAgent = createCustomAgent({
  name: "Data Science Assistant",
  chatModel: "gpt-4o",
  embeddingModel: "text-embedding-3-large",
  tools: ["dataVisualization", "codeAnalysis", "documentSummary"],
  instructions: "You are a data science expert...",
});
```

### 4. Tool Usage
```typescript
// Use web search tool
const searchResults = await webSearchTool.handler(ctx, {
  query: "latest AI developments",
  maxResults: 5,
  timeRange: "week",
});

// Use code analysis tool
const analysis = await codeAnalysisTool.handler(ctx, {
  code: "def fibonacci(n): ...",
  language: "python",
  analysisType: "optimize",
});
```

## Frontend Integration

### Model Selector Component
The AI prompt box includes a model selector that:
- Displays available models with descriptions
- Shows provider and category information
- Allows real-time model switching
- Integrates with the backend model system

### Usage Tracking
The system tracks:
- Model usage per user
- Token consumption
- Cost estimates
- Performance metrics
- Error rates

## Best Practices

### 1. Model Selection
- Use **fast models** (GPT-4.1 Nano, Gemini 2.5 Flash) for simple queries
- Use **powerful models** (GPT-4.1, Claude 4 Sonnet, Gemini 2.5 Pro) for complex tasks
- Use **reasoning models** (o1-mini, o1-preview) for logic problems
- **Default**: GPT-4.1 provides the best balance of speed and capability

### 2. Tool Configuration
- Enable only necessary tools to reduce latency
- Configure rate limits for expensive tools
- Use appropriate tool categories for organization
- Monitor tool usage and performance

### 3. Agent Design
- Create specialized agents for specific domains
- Configure appropriate context windows
- Set reasonable step and retry limits
- Include relevant tools for each agent's purpose

### 4. Performance Optimization
- Cache model configurations
- Use streaming for better UX
- Implement proper error handling
- Monitor usage and costs

## Extending the System

### Adding New Models
1. Add model configuration to `modelConfigs`
2. Ensure provider is configured
3. Test model integration
4. Update frontend model list

### Adding New Tools
1. Create tool using `createTool`
2. Add to `availableTools` object
3. Configure tool metadata
4. Add to relevant agent configurations

### Adding New Agents
1. Define agent configuration
2. Select appropriate model and tools
3. Write specialized instructions
4. Test agent performance
5. Add to agent registry

## Monitoring and Analytics

The system provides comprehensive monitoring:
- Real-time usage statistics
- Cost tracking per model/user
- Performance metrics
- Error logging
- Tool usage analytics

## Security Considerations

- API keys are stored securely in environment variables
- Rate limiting prevents abuse
- User authentication required for sensitive operations
- Tool access can be restricted per user
- Usage tracking for audit trails

## Future Enhancements

Planned improvements include:
- **Model fine-tuning** support
- **Custom tool creation** UI
- **Advanced analytics** dashboard
- **A/B testing** for models
- **Cost optimization** recommendations
- **Multi-modal** capabilities expansion 