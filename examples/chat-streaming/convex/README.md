# Convex Chat Streaming Backend

This is the backend implementation for a real-time chat streaming application built with Convex, featuring support for multiple AI providers and comprehensive web search capabilities.

## Features

- **Real-time chat streaming** with optimistic updates
- **Multi-provider AI support** (OpenAI, Anthropic, Google)
- **Comprehensive web search integration** for all providers
- **File upload and attachment support**
- **Thread management** with persistent chat history
- **Model switching** during conversations
- **Authentication and authorization**

## Web Search Support

The backend includes comprehensive web search capabilities for all major AI providers, allowing AI models to access current, up-to-date information from the web.

### Supported Providers and Pricing

| Provider | Web Search Feature | Cost | Supported Models |
|----------|-------------------|------|------------------|
| **OpenAI** | Responses API with `webSearchPreview` | $10 per 1,000 searches | gpt-4o-mini, gpt-4o, gpt-4.1, gpt-4.1-nano |
| **Anthropic** | Built-in web search via Messages API | $10 per 1,000 searches + token costs | claude-3-7-sonnet, claude-3-5-sonnet-v2, claude-3-5-haiku, claude-4-sonnet |
| **Google** | Grounding with Google Search | $35 per 1,000 grounded queries | gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro |

### Usage Examples

#### Basic Web Search Usage

```typescript
// Send a message with web search enabled
const result = await ctx.runMutation(api.chatStreaming.sendMessage, {
  threadId: "thread_123",
  prompt: "What are the latest developments in AI in 2024?",
  modelId: "gpt-4.1-nano",
  enableWebSearch: true, // Enable web search
});
```

#### Check Web Search Support

```typescript
// Check if a model supports web search
const support = await ctx.runQuery(api.chatStreaming.checkWebSearchSupport, {
  modelId: "claude-4-sonnet-20250514"
});

console.log(support);
// {
//   modelId: "claude-4-sonnet-20250514",
//   modelName: "Claude 4 Sonnet",
//   provider: "anthropic",
//   supportsWebSearch: true,
//   webSearchConfig: { ... }
// }
```

#### Get Available Web Search Tools

```typescript
// Get all available web search tools
const tools = await ctx.runQuery(api.chatStreaming.getAvailableWebSearchTools, {});

// Get web search tools for a specific model
const modelTools = await ctx.runQuery(api.chatStreaming.getWebSearchToolsForModel, {
  modelId: "gemini-2.5-flash-preview-05-20"
});
```

### API Reference

#### New Queries

- `getWebSearchCapabilities` - Get web search support for all models
- `checkWebSearchSupport` - Check if specific model supports web search  
- `getAvailableWebSearchTools` - Get all web search tools
- `getWebSearchToolsForModel` - Get tools for specific model

#### Enhanced Mutations

- `sendMessage` - Now supports `enableWebSearch` parameter

### Best Practices

#### When to Use Web Search

✅ **Good use cases:**
- Questions about recent events or current information
- Requests for up-to-date data (stock prices, news, etc.)
- Fact-checking and verification needs
- Research-heavy queries

❌ **Avoid for:**
- Simple conversational responses
- Creative writing tasks
- Mathematical calculations
- Code generation (unless requiring latest API docs)

#### Cost Optimization

1. **Use appropriate models**: Choose cost-effective models for web search
2. **Enable selectively**: Only enable web search when needed
3. **Set reasonable limits**: Configure `maxUses` to control costs
4. **Monitor usage**: Track web search usage across models

## Configuration

### Environment Variables

```bash
# Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_AI_API_KEY=your_google_key

# Optional: Custom providers
GROQ_API_KEY=your_groq_key
PERPLEXITY_API_KEY=your_perplexity_key

# Convex
CONVEX_DEPLOYMENT=your_convex_deployment
```

## Troubleshooting

### Common Issues

1. **Web search not working**
   - Check if model supports web search
   - Verify API keys are configured
   - Ensure `enableWebSearch` is set to `true`

2. **High costs**
   - Monitor web search usage
   - Use cost-effective models
   - Set appropriate rate limits

3. **Rate limiting**
   - Implement exponential backoff
   - Use provider-specific rate limits
   - Consider request queuing

## License

This project is licensed under the MIT License. 