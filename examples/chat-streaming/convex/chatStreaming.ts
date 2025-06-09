import { z } from "zod";
import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { ModelId, DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL, getAvailableModels, getModelConfig } from "./config/models";
import { 
  createModelInstance, 
  createEmbeddingInstance, 
  createModelInstanceWithAutoWebSearch,
  getProviderWebSearchTools,
  modelSupportsWebSearch,
  ModelInstanceOptions,
  getProviderWebSearchConfig
} from "./config/providers";
import { getAvailableAgents } from "./config/agents";
import {
  action,
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { v4 as uuidv4 } from "uuid";
import { providers } from "./config/providers";
import { experimental_generateImage as generateImage } from 'ai';
import { openai } from '@ai-sdk/openai';

// Zod schemas for validation
const ThreadIdSchema = z.string();
const PromptSchema = z.string().min(1, "Prompt cannot be empty");

// Function to create agent with specific model and optional web search
async function createAgentWithModel(modelId: ModelId, enableWebSearch: boolean = false) {
  let chatModel;
  let webSearchTools = {};
  
  if (enableWebSearch && modelSupportsWebSearch(modelId)) {
    // Use the auto web search function to get model with web search enabled
    const { model, webSearchTools: tools } = createModelInstanceWithAutoWebSearch(modelId);
    chatModel = model;
    if (tools) {
      webSearchTools = tools;
    }
  } else {
    chatModel = createModelInstance(modelId);
  }
  
  const embeddingModel = createEmbeddingInstance(DEFAULT_EMBEDDING_MODEL);

  const agent = new Agent(components.agent, {
    name: `${modelId} Agent${enableWebSearch ? " (Web Search)" : ""}`,
    chat: chatModel,
    textEmbedding: embeddingModel,
    instructions: enableWebSearch 
      ? "You are a helpful AI assistant with access to current web information. When users ask about recent events, current data, or need up-to-date information, use web search to provide accurate and timely responses. Always cite your sources when using web search results."
      : "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
  });

  return { agent, webSearchTools };
}

// Create a default agent instance for queries
async function getDefaultAgent() {
  const { agent } = await createAgentWithModel(DEFAULT_CHAT_MODEL, false);
  return agent;
}

/**
 * OPTIMISTIC MESSAGE SENDING
 * This mutation immediately saves the user's message and schedules AI response generation.
 * The user sees their message right away, then the AI response streams in.
 */
export const sendMessage = mutation({
  args: { 
    threadId: v.id("threads"), 
    prompt: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    enableWebSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, prompt, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [], enableWebSearch = false }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedModelId = ModelId.parse(modelId);
    
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);
    
    // Get the local thread to find the agent thread ID
    const localThread = await ctx.db.get(threadId);
    if (!localThread) {
      throw new Error("Thread not found");
    }

    let agentThreadId = localThread.agentThreadId;
    
    // Create agent thread if it doesn't exist
    if (!agentThreadId) {
      // Use the agent's createThread method to create the agent thread
      const { agent } = await createAgentWithModel(validatedModelId, enableWebSearch);
      const { threadId: newAgentThreadId } = await agent.createThread(ctx, { userId });
      agentThreadId = newAgentThreadId;
      
      // Update the local thread with the agent thread ID
      await ctx.db.patch(threadId, { agentThreadId });
    }

    // **KEY: Immediately save the user's message using agent.saveMessage**
    // This makes the message visible right away for optimistic updates
    const { agent } = await createAgentWithModel(validatedModelId, enableWebSearch);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId: agentThreadId,
      userId,
      prompt: validatedPrompt,
      skipEmbeddings: true, // We'll generate embeddings in the background
    });

    // Save attachment associations in our local messages table if needed
    if (attachmentIds.length > 0) {
      await ctx.db.insert("messages", {
        threadId,
        body: validatedPrompt,
        userId,
        attachments: attachmentIds,
      });
    }

    // Handle image generation specially
    if (validatedModelId === "gpt-image-1") {
      // Schedule image generation instead of AI response
      await ctx.scheduler.runAfter(0, internal.chatStreaming.generateImageResponse, {
        threadId: agentThreadId,
        promptMessageId: messageId,
        prompt: validatedPrompt,
      });
    } else {
      // Schedule the AI response generation in the background
      await ctx.scheduler.runAfter(0, internal.chatStreaming.generateAIResponse, {
        threadId: agentThreadId,
        promptMessageId: messageId,
        modelId: validatedModelId,
        attachmentIds,
        enableWebSearch,
      });
    }

    // Update thread timestamp
    await ctx.db.patch(threadId, {
      updatedAt: Date.now(),
    });

    return { messageId };
  },
});

/**
 * Background AI response generation with web search support
 * This runs after the user message is already saved and visible
 */
export const generateAIResponse = internalAction({
  args: { 
    threadId: v.string(), 
    promptMessageId: v.string(), 
    modelId: v.string(),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
    enableWebSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, promptMessageId, modelId, attachmentIds = [], enableWebSearch = false }) => {
    const validatedModelId = ModelId.parse(modelId);
    const { agent, webSearchTools } = await createAgentWithModel(validatedModelId, enableWebSearch);
    
    // Generate embeddings for the user message
    await agent.generateAndSaveEmbeddings(ctx, { messageIds: [promptMessageId] });
    
    // Continue the thread to generate AI response
    const { thread } = await agent.continueThread(ctx, { threadId });
    
    // Generate streaming response with optional web search tools
    const result = await thread.streamText(
      { promptMessageId },
      { 
        saveStreamDeltas: true,
        storageOptions: {
          saveOutputMessages: true,
          saveAnyInputMessages: false, // Already saved above
        },
        // Include web search tools if available
        ...(webSearchTools && Object.keys(webSearchTools).length > 0 && {
          tools: webSearchTools,
        }),
      }
    );
    
    // Consume the stream to process all deltas
    await result.consumeStream();
  },
});

/**
 * DEPRECATED - Use sendMessage instead for optimistic updates
 */
export const streamStoryAsynchronously = mutation({
  args: { 
    prompt: v.string(), 
    threadId: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    throw new Error("streamStoryAsynchronously is deprecated. Use sendMessage instead for optimistic updates.");
  },
});

/**
 * DEPRECATED - Use generateAIResponse instead
 */
export const createAgentThreadAndSaveMessage = internalAction({
  args: { 
    prompt: v.string(), 
    threadId: v.string(), 
    userId: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { prompt, threadId, userId, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [] }) => {
    // Redirect to new implementation
    const localThread = await ctx.runQuery(internal.chatStreaming.getLocalThread, { threadId });
    if (!localThread?.agentThreadId) {
      throw new Error("Agent thread not found - use sendMessage mutation instead");
    }
    
    await ctx.runAction(internal.chatStreaming.generateAIResponse, {
      threadId: localThread.agentThreadId,
      promptMessageId: "placeholder", // This is now handled differently
      modelId,
      attachmentIds,
    });
  },
});

/**
 * Query & subscribe to messages & threads
 */
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    // Validate inputs with Zod
    const validatedThreadId = ThreadIdSchema.parse(threadId);
    
    // Authorize access to the thread
    await authorizeThreadAccess(ctx, validatedThreadId as Id<"threads">);
    
    // Get the local thread to find the agent thread ID
    const localThread = await ctx.db.get(validatedThreadId as Id<"threads">);
    if (!localThread || !localThread.agentThreadId) {
      // If no agent thread exists yet, return empty structure with proper streams format
      const emptyStreams = streamArgs?.kind === "deltas" 
        ? { kind: "deltas" as const, deltas: [] }
        : streamArgs?.kind === "list"
        ? { kind: "list" as const, messages: [] }
        : { kind: "deltas" as const, deltas: [] };
      
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams: emptyStreams,
      };
    }
    
    // Use the agent to list messages from the agent thread
    const defaultAgent = await getDefaultAgent();
    const paginated = await defaultAgent.listMessages(ctx, { 
      threadId: localThread.agentThreadId, 
      paginationOpts 
    });
    
    // Sync streams for real-time delta updates - this is the key for streaming
    const streams = await defaultAgent.syncStreams(ctx, { 
      threadId: localThread.agentThreadId, 
      streamArgs: streamArgs || { kind: "deltas" as const, cursors: [] }  // Default to deltas with empty cursors
    });
    
    // Return both historical messages and streaming deltas
    return { ...paginated, streams };
  },
});

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    
    // Create thread in local database first
    const now = Date.now();
    const localThreadId = await ctx.db.insert("threads", {
      userId,
      uuid: uuidv4(),
      title: "New Chat",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    
    // Return the local thread ID - we'll handle agent thread creation
    // when the first message is sent
    return localThreadId;
  },
});

export const generateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    firstMessage: v.string(),
  },
  handler: async (ctx, { threadId, firstMessage }) => {
    // Validate inputs with Zod
    const validatedThreadId = ThreadIdSchema.parse(threadId);
    const validatedMessage = z.string().parse(firstMessage);
    
    // Get the user ID and authorize access
    const userId = await getUserId(ctx);
    const thread = await ctx.db.get(validatedThreadId as Id<"threads">);
    if (!thread || thread.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Generate a title from the first message (first 50 characters)
    const title = validatedMessage.length > 50
      ? validatedMessage.substring(0, 47) + "..."
      : validatedMessage;
    
    await ctx.db.patch(validatedThreadId as Id<"threads">, {
      title,
      updatedAt: Date.now(),
    });
  },
});

export const getLocalThread = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db.query("threads")
      .filter(q => q.eq(q.field("_id"), threadId))
      .first();
  },
});

// Add internal query to get file metadata
export const getFileMetadata = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.db.system.get(storageId);
  },
});

export const updateLocalThreadAgentId = internalMutation({
  args: { threadId: v.string(), agentThreadId: v.string() },
  handler: async (ctx, { threadId, agentThreadId }) => {
    await ctx.db.patch(threadId as Id<"threads">, { agentThreadId });
  },
});

// Add a query to list user threads
export const listUserThreads = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getUserId(ctx);
    
    return await ctx.db
      .query("threads")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

/**
 * ==============================
 * Functions for demo purposes.
 * In a real app, you'd use real authentication & authorization.
 * ==============================
 */

async function getUserId(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return z.string().parse(identity.subject);
}

async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: Id<"threads">,
) {
  const userId = await getUserId(ctx);
  if (!("db" in ctx)) {
    throw new Error("Database not available in this context");
  }
  const thread = await ctx.db.get(threadId);
  if (!thread || thread.userId !== userId) {
    throw new Error("Unauthorized");
  }
}

/**
 * Get all available models with their configurations
 */
export const getAvailableModelsQuery = query({
  args: {},
  handler: async (ctx) => {
    return getAvailableModels();
  },
});

/**
 * Get all available agents with their configurations (simplified)
 */
export const getAvailableAgentsQuery = query({
  args: {},
  handler: async (ctx) => {
    return getAvailableAgents();
  },
});

/**
 * Get model usage statistics
 */
export const getModelUsageStats = query({
  args: {
    timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, { timeRange = "week" }) => {
    // Validate input with Zod
    const validatedTimeRange = z.enum(["day", "week", "month"]).parse(timeRange);
    
    // In a real implementation, you would query usage data from your database
    // This is a mock implementation
    return {
      totalRequests: 1250,
      totalTokens: 125000,
      topModels: [
        { model: "gpt-4.1-nano", requests: 450, tokens: 45000 },
        { model: "claude-4-sonnet-20250514", requests: 320, tokens: 38000 },
        { model: "gpt-4.1", requests: 280, tokens: 32000 },
      ],
      costEstimate: 12.50,
      timeRange: validatedTimeRange,
    };
  },
});

// Add internal mutation to save message attachments association
export const saveMessageAttachments = internalMutation({
  args: { 
    threadId: v.string(), 
    messageContent: v.string(),
    attachmentIds: v.array(v.id("_storage")),
    userId: v.string(),
  },
  handler: async (ctx, { threadId, messageContent, attachmentIds, userId }) => {
    // Save to our local messages table for UI display
    await ctx.db.insert("messages", {
      threadId,
      body: messageContent,
      userId: userId, // Now matches schema as string
      attachments: attachmentIds,
    });
  },
});

// Add query to get message attachments for a thread
export const getThreadAttachments = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();
    
    return messages.map(msg => ({
      messageBody: msg.body,
      attachments: msg.attachments || [],
      _creationTime: msg._creationTime,
    }));
  },
});

// DEPRECATED functions kept for backward compatibility
export const streamResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string(), modelId: v.optional(v.string()) },
  handler: async (ctx, { promptMessageId, threadId, modelId = DEFAULT_CHAT_MODEL }) => {
    // Redirect to new implementation
    await ctx.runAction(internal.chatStreaming.generateAIResponse, {
      threadId,
      promptMessageId,
      modelId,
      attachmentIds: [],
    });
  },
});

/**
 * DEPRECATED - Use sendMessage instead
 */
export const sendMessageAndUpdateThread = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    isFirstMessage: v.boolean(),
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    throw new Error("sendMessageAndUpdateThread is deprecated. Use sendMessage instead for optimistic updates.");
  },
});

/**
 * DEPRECATED - Use sendMessage instead
 */
export const sendMessageWithModel = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    modelId: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    throw new Error("sendMessageWithModel is deprecated. Use sendMessage instead for optimistic updates.");
  },
});

/**
 * Get web search capabilities for all models
 */
export const getWebSearchCapabilities = query({
  args: {},
  handler: async (ctx) => {
    const models = getAvailableModels();
    
    return models.map(model => ({
      modelId: model.id,
      modelName: model.name,
      provider: model.provider,
      supportsWebSearch: modelSupportsWebSearch(model.id),
      webSearchConfig: modelSupportsWebSearch(model.id) 
        ? getProviderWebSearchConfig(model.provider)
        : null,
    }));
  },
});

/**
 * Check if a specific model supports web search
 */
export const checkWebSearchSupport = query({
  args: { modelId: v.string() },
  handler: async (ctx, { modelId }) => {
    const validatedModelId = ModelId.parse(modelId);
    const modelConfig = getModelConfig(validatedModelId);
    
    return {
      modelId: validatedModelId,
      modelName: modelConfig.name,
      provider: modelConfig.provider,
      supportsWebSearch: modelSupportsWebSearch(validatedModelId),
      webSearchConfig: modelSupportsWebSearch(validatedModelId) 
        ? getProviderWebSearchConfig(modelConfig.provider)
        : null,
    };
  },
});

/**
 * Get available web search tools for all providers
 */
export const getAvailableWebSearchTools = query({
  args: {},
  handler: async (ctx) => {
    const { getAllWebSearchTools } = await import("./tools");
    return getAllWebSearchTools();
  },
});

/**
 * Get web search tools for a specific model
 */
export const getWebSearchToolsForModel = query({
  args: { modelId: v.string() },
  handler: async (ctx, { modelId }) => {
    const validatedModelId = ModelId.parse(modelId);
    const { getAvailableWebSearchToolsForModel } = await import("./tools");
    return getAvailableWebSearchToolsForModel(validatedModelId);
  },
});

/**
 * Generate an image response for chat messages
 */
export const generateImageResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId, prompt }) => {
    const { agent } = await createAgentWithModel("gpt-4.1-nano", false);
    
    try {
      // Generate the image first
      const result = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt,
        size: "1024x1024",
      });
      
      console.log('Image generation result structure:', JSON.stringify(result, null, 2));
      
      // Cast to any to inspect the actual structure at runtime
      const resultAny = result as any;
      let url: string | undefined;
      
      if (resultAny.images && resultAny.images.length > 0) {
        const image = resultAny.images[0];
        console.log('First image object:', JSON.stringify(image, null, 2));
        console.log('First image properties:', Object.keys(image));
        
        // Use the correct property name from the logs
        if (image.base64Data) {
          url = `data:image/png;base64,${image.base64Data}`;
        } else if (image.base64) {
          url = `data:image/png;base64,${image.base64}`;
        } else if (image.url) {
          url = image.url;
        } else if (typeof image === 'string') {
          url = image;
        }
      }
      
      if (!url) {
        console.error('No image URL found in result. Available properties:', Object.keys(resultAny));
        console.error('First image properties:', resultAny.images?.[0] ? Object.keys(resultAny.images[0]) : 'No images');
        throw new Error('No image URL or base64 returned');
      }
      
      // Store the image in Convex storage
      const base64Data = url.split(',')[1]; // Remove the data:image/png;base64, prefix
      // Convert base64 to Uint8Array (Buffer alternative)
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });
      
      const storageId = await ctx.storage.store(blob);
      
      // Get the storage URL for the image
      const storageUrl = await ctx.storage.getUrl(storageId);
      
      if (!storageUrl) {
        throw new Error('Failed to get storage URL for generated image');
      }
      
      // Continue the thread to generate assistant response
      const { thread } = await agent.continueThread(ctx, { threadId });
      
      // Use thread.streamText to create proper assistant message with markdown support
      const streamResult = await thread.streamText(
        { prompt: `![Generated Image](${storageUrl})` },
        { 
          saveStreamDeltas: true,
          storageOptions: {
            saveOutputMessages: true,
            saveAnyInputMessages: false, // User message already saved
          },
        }
      );
      
      // Consume the stream to process all deltas
      await streamResult.consumeStream();
      
    } catch (error) {
      console.error('Error generating image:', error);
      
      // Continue the thread to generate error response as assistant message
      const { thread: errorThread } = await agent.continueThread(ctx, { threadId });
      
      // Use thread.streamText for error message too
      const errorResult = await errorThread.streamText(
        { prompt: `I'm sorry, I encountered an error while generating the image: ${error instanceof Error ? error.message : String(error)}` },
        { 
          saveStreamDeltas: true,
          storageOptions: {
            saveOutputMessages: true,
            saveAnyInputMessages: false,
          },
        }
      );
      
      await errorResult.consumeStream();
    }
  },
});

/**
 * Generate an image using DALL-E 3
 */
export const generateImageAction = action({
  args: {
    prompt: v.string(),
    size: v.optional(v.union(v.literal("1024x1024"), v.literal("1536x1024"), v.literal("1024x1536"))),
    quality: v.optional(v.union(v.literal("standard"), v.literal("high"))),
  },
  handler: async (
    ctx,
    { prompt, size = "1024x1024", quality }
  ): Promise<{ url: string; storageId: string; prompt: string; size: string; quality?: string }> => {
    try {
      const result = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt,
        size,
        providerOptions: quality ? { openai: { quality } } : undefined,
      });
      
      console.log('Image generation result structure:', JSON.stringify(result, null, 2));
      
             // Cast to any to inspect the actual structure at runtime
       const resultAny = result as any;
       let url: string | undefined;
       
       if (resultAny.images && resultAny.images.length > 0) {
         const image = resultAny.images[0];
         console.log('First image object:', JSON.stringify(image, null, 2));
         console.log('First image properties:', Object.keys(image));
         
         // Use the correct property name from the logs
         if (image.base64Data) {
           url = `data:image/png;base64,${image.base64Data}`;
         } else if (image.base64) {
           url = `data:image/png;base64,${image.base64}`;
         } else if (image.url) {
           url = image.url;
         } else if (typeof image === 'string') {
           url = image;
         }
       }
      
             if (!url) {
         console.error('No image URL found in result. Available properties:', Object.keys(resultAny));
         console.error('First image properties:', resultAny.images?.[0] ? Object.keys(resultAny.images[0]) : 'No images');
         throw new Error('No image URL or base64 returned');
       }
       
       // Store the image in Convex storage
       const base64Data = url.split(',')[1]; // Remove the data:image/png;base64, prefix
       // Convert base64 to Uint8Array (Buffer alternative)
       const binaryString = atob(base64Data);
       const bytes = new Uint8Array(binaryString.length);
       for (let i = 0; i < binaryString.length; i++) {
         bytes[i] = binaryString.charCodeAt(i);
       }
       const blob = new Blob([bytes], { type: 'image/png' });
       
       const storageId = await ctx.storage.store(blob);
       
       return { url, storageId, prompt, size, quality };
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
      }
      throw error;
    }
  },
});
