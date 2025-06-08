import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return identity;
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // This is a placeholder, the actual user creation is handled by the auth provider
    // The name and email can be stored in a users table if needed
    console.log("User created with name:", args.name, "and email:", args.email);
  },
});