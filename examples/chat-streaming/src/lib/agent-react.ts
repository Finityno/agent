// Re-export agent react hooks to work around build issues
// This file serves as a workaround for deployment environments
// where the @convex-dev/agent/react subpath export isn't resolved properly

export {
  useThreadMessages,
  toUIMessages,
  useSmoothText,
} from "@convex-dev/agent/react"; 