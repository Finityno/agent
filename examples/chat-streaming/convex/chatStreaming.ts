import { paginationOptsValidator } from "convex/server";
import { Agent, vStreamArgs } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { chat, textEmbedding } from "../../../example/examplesModels";
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

// Define an agent similarly to the AI SDK
export const storyAgent = new Agent(components.agent, {
  name: "Story Agent",
  chat: chat,
  textEmbedding: textEmbedding,
  instructions: "You tell stories with twist endings. ~ 200 words.",
});

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
      const { threadId: newAgentThreadId } = await storyAgent.createThread(ctx, { userId });
      agentThreadId = newAgentThreadId;
      
      // Update the local thread with the agent thread ID
      await ctx.runMutation(internal.chatStreaming.updateLocalThreadAgentId, {
        threadId,
        agentThreadId,
      });
    }
    
    // Save the message using the agent's thread ID
    const { messageId } = await storyAgent.saveMessage(ctx, {
      threadId: agentThreadId,
      prompt,
      skipEmbeddings: true,
    });
    
    // Now stream the story using the agent's thread ID
    await ctx.scheduler.runAfter(0, internal.chatStreaming.streamStory, {
      threadId: agentThreadId,
      promptMessageId: messageId,
    });
  },
});

export const streamStory = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const { thread } = await storyAgent.continueThread(ctx, { threadId });
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
    const paginated = await storyAgent.listMessages(ctx, { 
      threadId: localThread.agentThreadId, 
      paginationOpts 
    });
    const streams = await storyAgent.syncStreams(ctx, { 
      threadId: localThread.agentThreadId, 
      streamArgs 
    });
    
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
