import { useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../src/component/_generated/api";
import { useState } from "react";
import { Id } from "../../../src/component/_generated/dataModel";

export function usePlayground() {
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | undefined>();
  const [selectedThreadId, setSelectedThreadId] = useState<Id<"threads"> | undefined>();

  const users = useQuery(api.users.list) || [];
  const {
    results: threads,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.threads.list,
    { userId: selectedUserId },
    { initialNumItems: 10 },
  );

  const selectedThread = threads.find((thread) => thread._id === selectedThreadId);

  const selectThread = (thread: { _id: Id<"threads"> }) => {
    setSelectedThreadId(thread._id);
  };

  return {
    users,
    selectedUserId,
    setSelectedUserId,
    threads,
    selectedThread,
    selectThread,
    loadMoreThreads: loadMore,
    canLoadMoreThreads: !isLoading,
  };
}