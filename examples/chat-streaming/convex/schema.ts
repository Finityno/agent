import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  messages: defineTable({
    body: v.string(),
    threadId: v.string(),
    userId: v.string(),
    // File attachments stored as storage IDs directly for AI integration
    attachments: v.optional(v.array(v.id("_storage"))),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"]),
  threads: defineTable({
    userId: v.string(),
    uuid: v.optional(v.string()), // UUID for URL routing - optional for backward compatibility
    agentThreadId: v.optional(v.string()), // Agent thread ID for mapping
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),
});
