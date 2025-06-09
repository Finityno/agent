import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for any file type
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file data for AI processing with proper metadata
export const getFileForAI = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      return null;
    }

    // Get file metadata from storage system table
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata) {
      return null;
    }

    return {
      storageId: args.storageId,
      url,
      contentType: metadata.contentType,
      size: metadata.size,
      sha256: metadata.sha256,
      _creationTime: metadata._creationTime,
    };
  },
});

// Helper function to determine if file type is supported for AI vision
export const isImageFile = (contentType: string | undefined): boolean => {
  if (!contentType) return false;
  return contentType.startsWith('image/') && [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ].includes(contentType);
};

// Helper function to determine if file type is supported for multimodal AI
export const isMultimodalSupported = (contentType: string | undefined): boolean => {
  if (!contentType) return false;
  
  // Images
  if (isImageFile(contentType)) return true;
  
  // Documents
  if (contentType === 'application/pdf') return true;
  if (contentType.includes('document')) return true;
  if (contentType.startsWith('text/')) return true;
  
  // Audio files
  if (contentType.startsWith('audio/')) return true;
  
  return false;
};

// Get multiple files for batch processing
export const getMultipleFiles = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const files = [];
    
    for (const storageId of args.storageIds) {
      try {
        const url = await ctx.storage.getUrl(storageId);
        const metadata = await ctx.db.system.get(storageId);
        
        if (url && metadata) {
          files.push({
            storageId,
            url,
            contentType: metadata.contentType,
            size: metadata.size,
            sha256: metadata.sha256,
            _creationTime: metadata._creationTime,
          });
        }
      } catch (error) {
        console.error(`Error getting file ${storageId}:`, error);
      }
    }
    
    return files;
  },
});

 