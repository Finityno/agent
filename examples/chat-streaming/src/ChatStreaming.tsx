"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatContent } from "./components/ChatContent";
import { Toaster } from "./components/ui/toaster";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import "./ChatStreaming.css";

interface Thread {
  _id: Id<"threads">;
  uuid?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export default function ChatStreaming() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeThreadId, setActiveThreadId] = useState<Id<"threads"> | null>(null);
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();

  const shouldQueryThreads = isAuthenticated && !isLoading;
  
  // Single source of truth for threads - cache this data for both sidebar and content
  const threads = useConvexQuery(
    api.threads.listThreadsByUserId, 
    shouldQueryThreads ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );

  // Find thread by UUID from cached data instead of separate query
  const currentThread = useMemo(() => {
    if (!chatId || !threads?.page) return null;
    return threads.page.find((t: Thread) => t.uuid === chatId) || null;
  }, [chatId, threads?.page]);

  // Handle thread resolution from URL
  useEffect(() => {
    if (chatId) {
      // If threads are still loading, wait
      if (threads === undefined) {
        return;
      }
      
      // If thread not found in cache, redirect to chat home
      if (currentThread === null) {
        navigate("/chat", { replace: true });
        return;
      }
      
      // Set active thread from cache
      setActiveThreadId(currentThread._id);
    } else {
      setActiveThreadId(null);
    }
  }, [chatId, currentThread, threads, navigate]);

  // Memoized navigation handler to prevent unnecessary re-renders
  const handleSetActiveThreadId = useCallback((
    threadId: Id<"threads"> | null,
    threadUuid?: string,
  ) => {
    if (threadId && threadUuid) {
      navigate(`/chat/${threadUuid}`);
    } else {
      navigate("/chat");
    }
  }, [navigate]);

  // Show loading only for initial authentication, not for chat switches
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ChatSidebar
        activeThreadId={activeThreadId}
        setActiveThreadId={handleSetActiveThreadId}
        threads={threads} // Pass cached threads to avoid duplicate queries
      />
      <SidebarInset>
        <ChatContent
          activeThreadId={activeThreadId}
          setActiveThreadId={handleSetActiveThreadId}
          threads={threads} // Pass cached threads to avoid duplicate queries
          currentThread={currentThread} // Pass current thread data
        />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
