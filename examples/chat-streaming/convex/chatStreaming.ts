import { z } from "zod";
import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { ModelId, DEFAULT_CHAT_MODEL, DEFAULT_EMBEDDING_MODEL, getAvailableModels } from "./config/models";
import { createModelInstance, createEmbeddingInstance } from "./config/providers";
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

// Zod schemas for validation
const ThreadIdSchema = z.string();
const PromptSchema = z.string().min(1, "Prompt cannot be empty");

// Function to create agent with specific model
async function createAgentWithModel(modelId: ModelId) {
  const chatModel = createModelInstance(modelId);
  const embeddingModel = createEmbeddingInstance(DEFAULT_EMBEDDING_MODEL);

  return new Agent(components.agent, {
    name: `${modelId} Agent`,
    chat: chatModel,
    textEmbedding: embeddingModel,
    instructions: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
  });
}

// Create a default agent instance for queries
const defaultAgent = new Agent(components.agent, {
  name: "Default Chat Agent",
  chat: createModelInstance(DEFAULT_CHAT_MODEL),
  textEmbedding: createEmbeddingInstance(DEFAULT_EMBEDDING_MODEL),
  instructions: "You are a helpful AI assistant. Provide clear, accurate, and helpful responses.",
});

// Streaming, where generate the prompt message first, then asynchronously
// generate the stream response.
export const streamStoryAsynchronously = mutation({
  args: { 
    prompt: v.string(), 
    threadId: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { prompt, threadId, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [] }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedThreadId = ThreadIdSchema.parse(threadId);
    const validatedModelId = ModelId.parse(modelId);
    
    await authorizeThreadAccess(ctx, validatedThreadId as Id<"threads">);
    
    // Get the user ID in the mutation where we have auth context
    const userId = await getUserId(ctx);
    
    // Schedule the agent thread creation and message saving in an action
    // since agent operations require ActionCtx
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadAndSaveMessage, {
      threadId: validatedThreadId,
      prompt: validatedPrompt,
      userId, // Pass the userId to the internal action
      modelId: validatedModelId,
      attachmentIds,
    });
  },
});

export const sendMessage = mutation({
  args: { 
    threadId: v.id("threads"), 
    prompt: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { threadId, prompt, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [] }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedModelId = ModelId.parse(modelId);
    
    await authorizeThreadAccess(ctx, threadId);

    // Get the user ID in the mutation where we have auth context
    const userId = await getUserId(ctx);

    // Schedule the agent thread creation and message saving in an action
    // since agent operations require ActionCtx
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadAndSaveMessage, {
      threadId,
      prompt: validatedPrompt,
      userId,
      modelId: validatedModelId,
      attachmentIds,
    });
  },
});

export const createAgentThreadAndSaveMessage = internalAction({
  args: { 
    prompt: v.string(), 
    threadId: v.string(), 
    userId: v.string(), 
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { prompt, threadId, userId, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [] }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedThreadId = ThreadIdSchema.parse(threadId);
    const validatedUserId = z.string().parse(userId);
    const validatedModelId = ModelId.parse(modelId);
    
    // Get the local thread
    const localThread = await ctx.runQuery(internal.chatStreaming.getLocalThread, { threadId: validatedThreadId });
    if (!localThread) {
      throw new Error("Local thread not found");
    }
    
    let agentThreadId = localThread.agentThreadId;
    
    // Create an agent with the specified model
    const agent = await createAgentWithModel(validatedModelId);
    
    // Create agent thread if it doesn't exist
    if (!agentThreadId) {
      const { threadId: newAgentThreadId } = await agent.createThread(ctx, { userId: validatedUserId });
      agentThreadId = newAgentThreadId;
      
      // Update the local thread with the agent thread ID
      await ctx.runMutation(internal.chatStreaming.updateLocalThreadAgentId, {
        threadId: validatedThreadId,
        agentThreadId,
      });
    }
    
    // Build multimodal message content
    const messageContent: Array<any> = [
      { type: "text", text: validatedPrompt }
    ];
    
    // Process attachments and convert to proper content blocks
    if (attachmentIds.length > 0) {
      for (const storageId of attachmentIds) {
        try {
          // Get file metadata from storage system table using runQuery
          const metadata = await ctx.runQuery(internal.chatStreaming.getFileMetadata, { storageId });
          if (!metadata) {
            console.warn(`File metadata not found for storage ID: ${storageId}`);
            continue;
          }

          // Get file URL
          const fileUrl = await ctx.storage.getUrl(storageId);
          if (!fileUrl) {
            console.warn(`File URL not found for storage ID: ${storageId}`);
            continue;
          }

          // Add appropriate content block based on file type
          if (metadata.contentType?.startsWith('image/')) {
            // For images, use image content block
            messageContent.push({
              type: "image",
              image: new URL(fileUrl),
              mimeType: metadata.contentType,
            });
          } else if (metadata.contentType === 'application/pdf' || 
                     metadata.contentType?.includes('document') ||
                     metadata.contentType?.startsWith('text/') ||
                     metadata.contentType?.startsWith('audio/')) {
            // For PDFs and other files, fetch the actual file data
            try {
              const response = await fetch(fileUrl);
              if (response.ok) {
                const fileData = await response.arrayBuffer();
                messageContent.push({
                  type: "file",
                  data: fileData,
                  mimeType: metadata.contentType,
                  filename: `file_${storageId}`, // Optional filename
                });
              } else {
                console.warn(`Failed to fetch file data for ${storageId}: ${response.status}`);
                // Fallback: mention the file in text
                messageContent.push({
                  type: "text",
                  text: `\n[File attached: ${metadata.contentType}, ${metadata.size} bytes]`
                });
              }
            } catch (error) {
              console.error(`Error fetching file data for ${storageId}:`, error);
              // Fallback: mention the file in text
              messageContent.push({
                type: "text",
                text: `\n[File attached: ${metadata.contentType}, ${metadata.size} bytes]`
              });
            }
          } else {
            // For other file types, mention them in text
            messageContent.push({
              type: "text",
              text: `\n[File attached: ${metadata.contentType || 'unknown type'}, ${metadata.size} bytes]`
            });
          }
        } catch (error) {
          console.error(`Error processing attachment ${storageId}:`, error);
        }
      }
    }
    
    // Save message attachments association for UI display if there are attachments
    if (attachmentIds.length > 0) {
      await ctx.runMutation(internal.chatStreaming.saveMessageAttachments, {
        threadId: validatedThreadId,
        messageContent: validatedPrompt,
        attachmentIds,
        userId: validatedUserId,
      });
    }
    
    // Continue with the existing thread and generate streaming text with deltas
    const { thread } = await agent.continueThread(ctx, { threadId: agentThreadId });
    
    // Use streamText instead of generateText to enable real-time streaming with deltas
    let result;
    if (attachmentIds.length > 0) {
      // Use multimodal messages format when attachments are present
      result = await thread.streamText(
        { 
          messages: [
            {
              role: "user", 
              content: messageContent
            }
          ]
        },
        { 
          // Enable saving of stream deltas for real-time updates
          saveStreamDeltas: true,
          // Save the generated output to thread history
          storageOptions: {
            saveOutputMessages: true,
            saveAnyInputMessages: true,
          }
        }
      );
    } else {
      // Use simple prompt format when no attachments (like original code)
      result = await thread.streamText(
        { prompt: validatedPrompt },
        { 
          // Enable saving of stream deltas for real-time updates
          saveStreamDeltas: true,
          // Save the generated output to thread history
          storageOptions: {
            saveOutputMessages: true,
            saveAnyInputMessages: true,
          }
        }
      );
    }
    
    // Consume the stream to process all deltas
    await result.consumeStream();
  },
});

export const streamResponse = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string(), modelId: v.optional(v.string()) },
  handler: async (ctx, { promptMessageId, threadId, modelId = DEFAULT_CHAT_MODEL }) => {
    // Validate inputs with Zod
    const validatedMessageId = z.string().parse(promptMessageId);
    const validatedThreadId = ThreadIdSchema.parse(threadId);
    const validatedModelId = ModelId.parse(modelId);
    
    // Create an agent with the specified model
    const agent = await createAgentWithModel(validatedModelId);
    
    const { thread } = await agent.continueThread(ctx, { threadId: validatedThreadId });
    const result = await thread.streamText(
      { promptMessageId: validatedMessageId },
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

export const sendMessageAndUpdateThread = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    isFirstMessage: v.boolean(),
    modelId: v.optional(v.string()),
    attachmentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, { threadId, prompt, isFirstMessage, modelId = DEFAULT_CHAT_MODEL, attachmentIds = [] }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedModelId = ModelId.parse(modelId);
    
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);

    // Schedule agent action
    await ctx.scheduler.runAfter(
      0,
      internal.chatStreaming.createAgentThreadAndSaveMessage,
      {
        threadId,
        prompt: validatedPrompt,
        userId,
        modelId: validatedModelId,
        attachmentIds,
      },
    );

    // Update thread metadata
    if (isFirstMessage) {
      const title =
        validatedPrompt.length > 50 ? validatedPrompt.substring(0, 47) + "..." : validatedPrompt;
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

// Simplified functions without circular dependencies

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
    // Return a simple static list instead of dynamic imports
    return getAvailableAgents();
  },
});

/**
 * Send message with a specific model (simplified)
 */
export const sendMessageWithModel = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    modelId: v.string(),
    isFirstMessage: v.optional(v.boolean()),
  },
  handler: async (ctx, { threadId, prompt, modelId, isFirstMessage = false }) => {
    // Validate inputs with Zod
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedModelId = ModelId.parse(modelId);
    
    await authorizeThreadAccess(ctx, threadId);
    const userId = await getUserId(ctx);

    // Use the specific model for message sending
    await ctx.scheduler.runAfter(0, internal.chatStreaming.createAgentThreadAndSaveMessage, {
      threadId,
      prompt: validatedPrompt,
      userId,
      modelId: validatedModelId,
    });

    // Update thread metadata
    if (isFirstMessage) {
      const title = validatedPrompt.length > 50 ? validatedPrompt.substring(0, 47) + "..." : validatedPrompt;
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
