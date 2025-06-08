import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { agents, recommendAgent, createCustomAgent } from "./lib/agents";
import { getAvailableModels } from "./lib/models";
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

// Use the improved agent system - default to fast agent for quick responses
export const defaultAgent = agents.fast;

// Streaming, where generate the prompt message first, then asynchronously
// generate the stream response.
export const streamStoryAsynchronously = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await authorizeThreadAccess(ctx, threadId as Id<"threads">);
    
    // Get the user ID in the mutation where we have auth context
    const userId = await getUserId(ctx);
    
    // Schedule the agent thread creation and message saving in an action
    // since agent operations require ActionCtx
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadAndSaveMessage, {
      threadId,
      prompt,
      userId, // Pass the userId to the internal action
    });
  },
});
export const sendMessage = mutation({
  args: { threadId: v.id("threads"), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    await authorizeThreadAccess(ctx, threadId);

    // Get the user ID in the mutation where we have auth context
    const userId = await getUserId(ctx);

    // Schedule the agent thread creation and message saving in an action
    // since agent operations require ActionCtx
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadAndSaveMessage, {
      threadId,
      prompt,
      userId,
    });
  },
});

export const createAgentThreadAndSaveMessage = internalAction({
  args: { prompt: v.string(), threadId: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, threadId, userId }) => {
    // User ID is now passed from the mutation
    
    // Get the local thread
    const localThread = await ctx.runQuery(internal.chatStreaming.getLocalThread, { threadId });
    if (!localThread) {
      throw new Error("Local thread not found");
    }
    
    let agentThreadId = localThread.agentThreadId;
    
    // Create agent thread if it doesn't exist
    if (!agentThreadId) {
      const { threadId: newAgentThreadId } = await defaultAgent.createThread(ctx, { userId });
      agentThreadId = newAgentThreadId;
      
      // Update the local thread with the agent thread ID
      await ctx.runMutation(internal.chatStreaming.updateLocalThreadAgentId, {
        threadId,
        agentThreadId,
      });
    }
    
    // Save the message using the agent's thread ID
    const { messageId } = await defaultAgent.saveMessage(ctx, {
      threadId: agentThreadId,
      prompt,
      skipEmbeddings: true,
    });
    
    // Now stream the response using the agent's thread ID
    await ctx.scheduler.runAfter(0, internal.chatStreaming.streamResponse, {
      threadId: agentThreadId,
      promptMessageId: messageId,
    });
  },
});

export const streamResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const { thread } = await defaultAgent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true },
    );
    await result.consumeStream();
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
    // Authorize access to the thread
    await authorizeThreadAccess(ctx, threadId as Id<"threads">);
    
    // Get the local thread to find the agent thread ID
    const localThread = await ctx.db.get(threadId as Id<"threads">);
    if (!localThread || !localThread.agentThreadId) {
      // If no agent thread exists yet, return empty structure with proper streams format
      // Handle both "list" and "deltas" stream types
      const streams = streamArgs?.kind === "deltas" 
        ? { kind: "deltas" as const, deltas: [] }
        : { kind: "list" as const, messages: [] };
      
      return {
        page: [],
        isDone: true,
        continueCursor: "",
        streams,
      };
    }
    
    // Use the agent's built-in functions as recommended in the documentation
    const paginated = await defaultAgent.listMessages(ctx, { 
      threadId: localThread.agentThreadId, 
      paginationOpts 
    });
    const streams = await defaultAgent.syncStreams(ctx, { 
      threadId: localThread.agentThreadId, 
      streamArgs 
    });
    
    const combinedMessages = paginated.page.map((message: any) => ({
      ...message,
      isOptimistic: false,
    }));

    return { ...paginated, page: combinedMessages, streams };
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
    // Get the user ID and authorize access
    const userId = await getUserId(ctx);
    const thread = await ctx.db.get(threadId as Id<"threads">);
    if (!thread || thread.userId !== userId) {
      throw new Error("Unauthorized");
    }
    
    // Generate a title from the first message (first 50 characters)
    const title = firstMessage.length > 50
      ? firstMessage.substring(0, 47) + "..."
      : firstMessage;
    
    await ctx.db.patch(threadId as Id<"threads">, {
      title,
      updatedAt: Date.now(),
    });
  },
});

export const getLocalThread = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db.get(threadId as Id<"threads">);
  },
});

export const updateLocalThreadAgentId = internalMutation({
  args: { threadId: v.string(), agentThreadId: v.string() },
  handler: async (ctx, { threadId, agentThreadId }) => {
    await ctx.db.patch(threadId as Id<"threads">, {
      agentThreadId,
    });
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
  return identity.subject;
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

export const sendMessageAndUpdateThread = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    isFirstMessage: v.boolean(),
  },
  handler: async (ctx, { threadId, prompt, isFirstMessage }) => {
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);

    // Schedule agent action
    await ctx.scheduler.runAfter(
      0,
      internal.chatStreaming.createAgentThreadAndSaveMessage,
      {
        threadId,
        prompt,
        userId,
      },
    );

    // Update thread metadata
    if (isFirstMessage) {
      const title =
        prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
      await ctx.db.patch(threadId, {
        title,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(threadId, {
        updatedAt: Date.now(),
      });
    }
  },
});

// New functions for the improved model and agent system

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
 * Get all available agents with their configurations
 */
export const getAvailableAgentsQuery = query({
  args: {},
  handler: async (ctx) => {
    const { getAvailableAgents } = await import("./lib/agents");
    return getAvailableAgents();
  },
});

/**
 * Send message with a specific model
 */
export const sendMessageWithModel = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    modelId: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, prompt, modelId, isFirstMessage = false }) => {
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);

    // Schedule the agent action with specific model
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadWithModel, {
      threadId,
      prompt,
      userId,
      modelId,
    });

    // Update thread metadata
    if (isFirstMessage) {
      const title = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
      await ctx.db.patch(threadId, {
        title,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(threadId, {
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Create agent thread with a specific model
 */
export const createAgentThreadWithModel = internalAction({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    userId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, { prompt, threadId, userId, modelId }) => {
    // Get the local thread
    const localThread = await ctx.runQuery(internal.chatStreaming.getLocalThread, { threadId });
    if (!localThread) {
      throw new Error("Local thread not found");
    }

    let agentThreadId = localThread.agentThreadId;

    // Create a custom agent with the specified model
    const customAgent = createCustomAgent({
      name: "Custom Chat Agent",
      chatModel: modelId,
      instructions: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
    });

    // Create agent thread if it doesn't exist
    if (!agentThreadId) {
      const { threadId: newAgentThreadId } = await customAgent.createThread(ctx, { userId });
      agentThreadId = newAgentThreadId;

      // Update the local thread with the agent thread ID
      await ctx.runMutation(internal.chatStreaming.updateLocalThreadAgentId, {
        threadId,
        agentThreadId,
      });
    }

    // Save the message using the custom agent
    const { messageId } = await customAgent.saveMessage(ctx, {
      threadId: agentThreadId,
      prompt,
      skipEmbeddings: true,
    });

    // Stream the response using the custom agent
    await ctx.scheduler.runAfter(0, internal.chatStreaming.streamWithCustomAgent, {
      threadId: agentThreadId,
      promptMessageId: messageId,
      modelId,
    });
  },
});

/**
 * Stream response with custom agent
 */
export const streamWithCustomAgent = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, { promptMessageId, threadId, modelId }) => {
    // Create a custom agent with the specified model
    const customAgent = createCustomAgent({
      name: "Custom Chat Agent",
      chatModel: modelId,
      instructions: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
    });

    const { thread } = await customAgent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true }
    );
    await result.consumeStream();
  },
});

/**
 * Send message with intelligent agent selection
 */
export const sendMessageWithSmartAgent = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, prompt, isFirstMessage = false }) => {
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);

    // Schedule the agent action with smart agent selection
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createSmartAgentThread, {
      threadId,
      prompt,
      userId,
    });

    // Update thread metadata
    if (isFirstMessage) {
      const title = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
      await ctx.db.patch(threadId, {
        title,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(threadId, {
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Create agent thread with intelligent agent selection
 */
export const createSmartAgentThread = internalAction({
  args: {
    prompt: v.string(),
    threadId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { prompt, threadId, userId }) => {
    // Get the local thread
    const localThread = await ctx.runQuery(internal.chatStreaming.getLocalThread, { threadId });
    if (!localThread) {
      throw new Error("Local thread not found");
    }

    let agentThreadId = localThread.agentThreadId;

    // Recommend the best agent based on the prompt
    const recommendedAgentType = recommendAgent(prompt);
    const selectedAgent = agents[recommendedAgentType];

    // Create agent thread if it doesn't exist
    if (!agentThreadId) {
      const { threadId: newAgentThreadId } = await selectedAgent.createThread(ctx, { userId });
      agentThreadId = newAgentThreadId;

      // Update the local thread with the agent thread ID
      await ctx.runMutation(internal.chatStreaming.updateLocalThreadAgentId, {
        threadId,
        agentThreadId,
      });
    }

    // Save the message using the selected agent
    const { messageId } = await selectedAgent.saveMessage(ctx, {
      threadId: agentThreadId,
      prompt,
      skipEmbeddings: true,
    });

    // Stream the response using the selected agent
    await ctx.scheduler.runAfter(0, internal.chatStreaming.streamWithSelectedAgent, {
      threadId: agentThreadId,
      promptMessageId: messageId,
      agentType: recommendedAgentType,
    });
  },
});

/**
 * Stream response with selected agent
 */
export const streamWithSelectedAgent = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
    agentType: v.string(),
  },
  handler: async (ctx, { promptMessageId, threadId, agentType }) => {
    const selectedAgent = agents[agentType as keyof typeof agents] || agents.chat;
    const { thread } = await selectedAgent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true }
    );
    await result.consumeStream();
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
    // In a real implementation, you would query usage data from your database
    // This is a mock implementation
    return {
      totalRequests: 1250,
      totalTokens: 125000,
      topModels: [
        { model: "gpt-4o-mini", requests: 450, tokens: 45000 },
        { model: "claude-3-5-sonnet-20241022", requests: 320, tokens: 38000 },
        { model: "gpt-4o", requests: 280, tokens: 32000 },
      ],
      costEstimate: 12.50,
      timeRange,
    };
  },
});
