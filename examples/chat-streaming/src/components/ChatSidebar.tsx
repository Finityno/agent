"use client"

import { useMutation, useConvexAuth, useQuery as useConvexQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PlusIcon, Search, Trash2, MoreHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatSidebarProps {
  activeThreadId: Id<"threads"> | null;
  setActiveThreadId: (id: Id<"threads"> | null, uuid?: string) => void;
}

interface Thread {
  _id: Id<"threads">;
  uuid?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

export function ChatSidebar({
  activeThreadId,
  setActiveThreadId,
}: ChatSidebarProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isCreating, setIsCreating] = useState(false);
  
  const shouldQueryThreads = isAuthenticated && !isLoading;
  
  const threads = useConvexQuery(
    api.threads.listThreadsByUserId, 
    shouldQueryThreads ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );
  
  const createThread = useMutation(api.chatStreaming.createThread);
  const deleteThread = useMutation(api.threads.deleteThread);

  // Track newly created thread to handle navigation
  const [newlyCreatedThreadId, setNewlyCreatedThreadId] = useState<Id<"threads"> | null>(null);

  // Handle navigation for newly created threads when threads data updates
  useEffect(() => {
    if (newlyCreatedThreadId && threads?.page) {
      const newThread = threads.page.find((t: Thread) => t._id === newlyCreatedThreadId);
      if (newThread && newThread.uuid) {
        setActiveThreadId(newlyCreatedThreadId, newThread.uuid);
        setNewlyCreatedThreadId(null); // Clear the flag
      }
    }
  }, [threads, newlyCreatedThreadId, setActiveThreadId]);

  const handleCreateThread = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const id = await createThread();
      setNewlyCreatedThreadId(id as Id<"threads">);
      // Remove the immediate setActiveThreadId call to prevent double navigation
      // The useEffect will handle setting the active thread once UUID is available
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteThread = async (threadId: Id<"threads">, e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }
    
    await deleteThread({ threadId });
  };

  const handleThreadClick = (thread: Thread) => {
    if (thread.uuid) {
      setActiveThreadId(thread._id, thread.uuid);
    } else {
      // For threads without UUID, just use the Convex ID
      setActiveThreadId(thread._id);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="bg-primary/10 size-8 rounded-md"></div>
          <div className="text-md font-base text-primary tracking-tight">
            zola.chat
          </div>
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
            onClick={handleCreateThread}
            disabled={isCreating}
          >
            <PlusIcon className="size-4" />
            <span>{isCreating ? "Creating..." : "New Chat"}</span>
          </Button>
        </div>
        <SidebarMenu className="px-2">
          {threads?.page.map((thread: Thread) => (
            <div
              key={thread._id}
              className="group relative flex items-center"
            >
              <SidebarMenuButton
                isActive={activeThreadId === thread._id}
                onClick={() => handleThreadClick(thread)}
                className="flex-1 justify-start pr-8"
              >
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="truncate text-sm font-medium">
                    {thread.title || "New Chat"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(thread.updatedAt)}
                  </span>
                </div>
              </SidebarMenuButton>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => handleDeleteThread(thread._id, e)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          {threads?.page.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start a new chat to begin.
            </div>
          )}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}