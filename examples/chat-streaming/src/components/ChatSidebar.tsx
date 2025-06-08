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
  threads?: any; // Cached threads data to avoid duplicate queries
}

interface Thread {
  _id: Id<"threads">;
  uuid?: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

interface GroupedThreads {
  today: Thread[];
  last7Days: Thread[];
  last30Days: Thread[];
  older: Thread[];
}

export function ChatSidebar({
  activeThreadId,
  setActiveThreadId,
  threads: cachedThreads,
}: ChatSidebarProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [hoveredThreadId, setHoveredThreadId] = useState<Id<"threads"> | null>(null);
  
  // Use cached threads if available, otherwise query
  const shouldQueryThreads = isAuthenticated && !isLoading && !cachedThreads;
  
  const queriedThreads = useConvexQuery(
    api.threads.listThreadsByUserId, 
    shouldQueryThreads ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );
  
  const threads = cachedThreads || queriedThreads;
  
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



  const groupThreadsByTime = (threads: Thread[]): GroupedThreads => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return threads.reduce(
      (groups, thread) => {
        const threadDate = new Date(thread.updatedAt);
        
        if (threadDate >= today) {
          groups.today.push(thread);
        } else if (threadDate >= last7Days) {
          groups.last7Days.push(thread);
        } else if (threadDate >= last30Days) {
          groups.last30Days.push(thread);
        } else {
          groups.older.push(thread);
        }
        
        return groups;
      },
      { today: [], last7Days: [], last30Days: [], older: [] } as GroupedThreads
    );
  };

  const renderThreadGroup = (title: string, threads: Thread[]) => {
    if (threads.length === 0) return null;

    return (
      <div key={title} className="mb-6">
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
          {title}
        </div>
        <div className="space-y-1">
          {threads.map((thread: Thread) => (
            <div
              key={thread._id}
              className={`relative flex items-center mx-2 rounded-sm transition-colors duration-200 ${
                hoveredThreadId === thread._id ? 'bg-accent/50' : ''
              } ${activeThreadId === thread._id ? 'bg-accent' : ''}`}
              onMouseEnter={() => setHoveredThreadId(thread._id)}
              onMouseLeave={() => setHoveredThreadId(null)}
            >
              <SidebarMenuButton
                isActive={activeThreadId === thread._id}
                onClick={() => handleThreadClick(thread)}
                className="flex-1 justify-start pr-8 hover:bg-transparent rounded-sm"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <span className="truncate text-sm font-normal">
                    {thread.title || "New Chat"}
                  </span>
                </div>
              </SidebarMenuButton>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`absolute right-2 h-6 w-6 p-0 rounded-sm transition-opacity duration-200 ${
                      hoveredThreadId === thread._id ? 'opacity-100' : 'opacity-0'
                    }`}
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
        </div>
      </div>
    );
  };

  const groupedThreads = threads?.page ? groupThreadsByTime(threads.page) : null;

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
            className="mb-4 flex w-full items-center gap-2 rounded-sm"
            onClick={handleCreateThread}
            disabled={isCreating}
          >
            <PlusIcon className="size-4" />
            <span>{isCreating ? "Creating..." : "New Chat"}</span>
          </Button>
        </div>
        <SidebarMenu className="px-0">
          {groupedThreads && (
            <>
              {renderThreadGroup("Today", groupedThreads.today)}
              {renderThreadGroup("Last 7 days", groupedThreads.last7Days)}
              {renderThreadGroup("Last 30 days", groupedThreads.last30Days)}
              {renderThreadGroup("Older", groupedThreads.older)}
            </>
          )}
          
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