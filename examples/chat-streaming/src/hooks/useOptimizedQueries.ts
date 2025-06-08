import { useQuery as useConvexQuery, useConvexAuth } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Optimized hook for fetching threads with intelligent caching
 * This hook ensures threads are only fetched once and shared across components
 */
export function useOptimizedThreads() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  const shouldQuery = isAuthenticated && !isLoading;
  
  const threads = useConvexQuery(
    api.threads.listThreadsByUserId,
    shouldQuery ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  // Memoize the threads data to prevent unnecessary re-renders
  const memoizedThreads = useMemo(() => threads, [threads]);

  return {
    threads: memoizedThreads,
    isLoading: threads === undefined && shouldQuery,
    isAuthenticated,
  };
}

/**
 * Optimized hook for finding a thread by UUID from cached data
 * Avoids separate API calls when thread data is already available
 */
export function useThreadByUuid(uuid: string | undefined, cachedThreads?: any) {
  return useMemo(() => {
    if (!uuid || !cachedThreads?.page) return null;
    return cachedThreads.page.find((t: any) => t.uuid === uuid) || null;
  }, [uuid, cachedThreads?.page]);
}

/**
 * Optimized hook for thread messages with caching
 */
export function useOptimizedThreadMessages(threadId: Id<"threads"> | null) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  const shouldQuery = isAuthenticated && !isLoading && threadId;
  
  return useConvexQuery(
    api.chatStreaming.listThreadMessages,
    shouldQuery ? { 
      threadId,
      paginationOpts: { numItems: 10, cursor: null }
    } : "skip"
  );
}

/**
 * Hook to get current thread from cached threads list
 * Eliminates need for separate thread queries
 */
export function useCurrentThread(activeThreadId: Id<"threads"> | null, cachedThreads?: any) {
  return useMemo(() => {
    if (!activeThreadId || !cachedThreads?.page) return null;
    return cachedThreads.page.find((t: any) => t._id === activeThreadId) || null;
  }, [activeThreadId, cachedThreads?.page]);
} 