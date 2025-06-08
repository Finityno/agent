import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { v4 as uuidv4 } from "uuid";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: identity.subject,
      paginationOpts,
    });
  },
});

export const listThreadsByUserId = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get threads from the database ordered by updatedAt descending
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .paginate(paginationOpts);

    return threads;
  },
});

export const getThreadByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, { uuid }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("uuid"), uuid))
      .first();

    if (!thread || thread.userId !== identity.subject) {
      return null;
    }

    return thread;
  },
});

export const migrateThreadsWithUuids = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all threads without UUIDs
    const threadsWithoutUuids = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("uuid"), undefined))
      .collect();

    // Add UUIDs to threads that don't have them
    for (const thread of threadsWithoutUuids) {
      await ctx.db.patch(thread._id, {
        uuid: uuidv4(),
      });
    }

    return { migrated: threadsWithoutUuids.length };
  },
});

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, { title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const threadId = await ctx.db.insert("threads", {
      userId: identity.subject,
      uuid: uuidv4(),
      title: title || "New Chat",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return threadId;
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(threadId, {
      title,
      updatedAt: Date.now(),
    });
  },
});

export const updateThreadTimestamp = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(threadId, {
      updatedAt: Date.now(),
    });
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Delete all messages in the thread first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the thread
    await ctx.db.delete(threadId);
  },
});