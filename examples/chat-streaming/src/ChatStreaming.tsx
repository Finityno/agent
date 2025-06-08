"use client";

import { useState, useEffect } from "react";
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

export default function ChatStreaming() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeThreadId, setActiveThreadId] = useState<Id<"threads"> | null>(
    null,
  );
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();

  const shouldQueryThread = isAuthenticated && !isLoading && chatId;

  // Get thread by UUID if chatId is provided - only query if authenticated and not loading
  const threadByUuid = useConvexQuery(
    api.threads.getThreadByUuid,
    shouldQueryThread ? { uuid: chatId } : "skip",
  );

  // This hook is now the source of truth for the active thread
  useEffect(() => {
    if (chatId) {
      if (threadByUuid === undefined) {
        return; // Still loading
      }
      if (threadByUuid === null) {
        navigate("/chat", { replace: true }); // Not found
      } else {
        setActiveThreadId(threadByUuid._id); // Found
      }
    } else {
      setActiveThreadId(null); // No chat selected
    }
  }, [chatId, threadByUuid, navigate]);

  // Show loading state
  if (chatId && threadByUuid === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // URL is the single source of truth. This function just navigates.
  const handleSetActiveThreadId = (
    threadId: Id<"threads"> | null,
    threadUuid?: string,
  ) => {
    if (threadId && threadUuid) {
      navigate(`/chat/${threadUuid}`);
    } else {
      navigate("/chat");
    }
  };

  return (
    <SidebarProvider>
      <ChatSidebar
        activeThreadId={activeThreadId}
        setActiveThreadId={handleSetActiveThreadId}
      />
      <SidebarInset>
        <ChatContent
          activeThreadId={activeThreadId}
          setActiveThreadId={handleSetActiveThreadId}
        />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
