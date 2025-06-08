import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    author: v.string(),
    body: v.string(),
    threadId: v.string(),
  }).index("by_threadId", ["threadId"]),
  threads: defineTable({
    userId: v.string(),
  }),
});
