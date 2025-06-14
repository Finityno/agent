import { ContextOptions } from "@convex-dev/agent";
import { StorageOptions } from "./index.js";

// TODO: store preferences in local storage
export const DEFAULT_CONTEXT_OPTIONS = {
  recentMessages: 10,
  excludeToolMessages: false,
  searchOtherThreads: false,
  searchOptions: {
    limit: 0,
    textSearch: true,
    vectorSearch: true,
    messageRange: { before: 2, after: 1 },
  },
} as const satisfies ContextOptions;

export const DEFAULT_STORAGE_OPTIONS = {
  save: "promptAndOutput",
} as const satisfies StorageOptions;
