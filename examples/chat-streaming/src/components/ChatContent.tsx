"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/ui/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import { PromptInputBox } from "./ai-prompt-box"
import { ScrollButton } from "./ui/scroll-button"
import { Button } from "./ui/button"
import { SidebarTrigger } from "./ui/sidebar"
import { cn } from "../lib/utils"
import {
  Copy,
  ThumbsDown,
  ThumbsUp,
  Pencil,
  Trash,
} from "lucide-react"
import { useRef, memo, useMemo, useCallback } from "react"
import { useMutation, useConvexAuth, useQuery as useConvexQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  useThreadMessages,
  toUIMessages,
  useSmoothText,
} from "@convex-dev/agent/react"

interface ChatContentProps {
  activeThreadId: Id<"threads"> | null;
  setActiveThreadId: (id: Id<"threads"> | null, uuid?: string) => void;
  threads?: any; // Cached threads data to avoid duplicate queries
  currentThread?: any; // Current thread data passed from parent
}

// Memoized Message component to prevent unnecessary re-renders
const MemoizedMessage = memo(({ 
  message, 
  index, 
  uiMessagesLength,
  onCopyMessage,
  onEditMessage,
  onDeleteMessage,
}: {
  message: any;
  index: number;
  uiMessagesLength: number;
  onCopyMessage: (content: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}) => {
  const isAssistant = message.role !== "user"
  const isLastMessage = index === uiMessagesLength - 1
  
  // Always use useSmoothText for assistant messages - the hook will automatically
  // detect when content is changing and apply smooth animation
  const [smoothedContent] = useSmoothText(isAssistant ? (message.content || "") : "")
  
  // For assistant messages, use smoothed content; for user messages, use original content
  const displayContent = isAssistant ? smoothedContent : message.content

  // Memoize click handlers to prevent unnecessary re-renders
  const handleCopy = useCallback(() => {
    onCopyMessage(message.content || displayContent)
  }, [message.content, displayContent, onCopyMessage])

  const handleEdit = useCallback(() => {
    onEditMessage?.(message.key)
  }, [message.key, onEditMessage])

  const handleDelete = useCallback(() => {
    onDeleteMessage?.(message.key)
  }, [message.key, onDeleteMessage])

  // Memoize the action buttons to prevent re-renders
  const assistantActions = useMemo(() => (
    <MessageActions
      className={cn(
        "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
        isLastMessage && "opacity-100",
      )}
    >
      <MessageAction tooltip="Copy" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleCopy}
        >
          <Copy />
        </Button>
      </MessageAction>
      <MessageAction tooltip="Upvote" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <ThumbsUp />
        </Button>
      </MessageAction>
      <MessageAction tooltip="Downvote" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <ThumbsDown />
        </Button>
      </MessageAction>
    </MessageActions>
  ), [isLastMessage, handleCopy])

  const userActions = useMemo(() => (
    <MessageActions
      className={cn(
        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
      )}
    >
      <MessageAction tooltip="Edit" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleEdit}
        >
          <Pencil />
        </Button>
      </MessageAction>
      <MessageAction tooltip="Delete" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleDelete}
        >
          <Trash />
        </Button>
      </MessageAction>
      <MessageAction tooltip="Copy" delayDuration={100}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleCopy}
        >
          <Copy />
        </Button>
      </MessageAction>
    </MessageActions>
  ), [handleEdit, handleDelete, handleCopy])

  return (
    <Message
      key={message.key}
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col gap-2 px-6",
        isAssistant ? "items-start" : "items-end",
      )}
    >
      {isAssistant ? (
        <div className="group flex w-full flex-col gap-0">
          <MessageContent
            className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 ai-message-content"
            markdown
          >
            {displayContent}
          </MessageContent>
          {assistantActions}
        </div>
      ) : (
        <div className="group flex flex-col items-end gap-1">
          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
            {displayContent}
          </MessageContent>
          {userActions}
        </div>
      )}
    </Message>
  );
});

MemoizedMessage.displayName = "MemoizedMessage";

function ChatContent({ 
  activeThreadId, 
  setActiveThreadId, 
  threads: cachedThreads, 
  currentThread 
}: ChatContentProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  // Use useRef to store stable references
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Memoize thread messages options to prevent unnecessary re-renders
  const threadMessagesOptions = useMemo(
    () => ({ 
      initialNumItems: 10, 
      stream: true  // Enable streaming for real-time updates
    }),
    [],
  );
  
  const messages = useThreadMessages(
    api.chatStreaming.listThreadMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip",
    threadMessagesOptions,
  );
  
  // Memoize mutations to prevent unnecessary re-creations
  const sendMessageAndUpdateThread = useMutation(
    api.chatStreaming.sendMessageAndUpdateThread,
  );
  
  const createThread = useMutation(api.chatStreaming.createThread);

  // Memoize message action handlers
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
  }, [])

  const handleEditMessage = useCallback((messageId: string) => {
    // TODO: Implement edit functionality
    console.log("Edit message:", messageId)
  }, [])

  const handleDeleteMessage = useCallback((messageId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete message:", messageId)
  }, [])

  // Memoize submit handler
  const handleSubmit = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;

    let threadId = activeThreadId;

    // Create a new thread if none is active
    if (!threadId) {
      threadId = await createThread() as Id<"threads">;
      // Set the active thread ID immediately so the UI updates
      setActiveThreadId(threadId);
    }

    const isFirstMessage = !messages?.results || messages.results.length === 0;

    sendMessageAndUpdateThread({
      prompt: prompt.trim(),
      threadId,
      isFirstMessage,
    });
  }, [activeThreadId, createThread, setActiveThreadId, messages?.results, sendMessageAndUpdateThread]);

  // Memoize UI messages transformation
  const uiMessages = useMemo(() => toUIMessages(messages?.results ?? []), [messages?.results]);

  // Determine if we're currently streaming
  const isStreaming = messages.isLoading && uiMessages.length > 0;

  // Use cached threads if available, otherwise query (fallback for backward compatibility)
  const shouldQueryThreads = isAuthenticated && !isLoading && !cachedThreads;
  
  const queriedThreads = useConvexQuery(
    api.threads.listThreadsByUserId, 
    shouldQueryThreads ? {
      paginationOpts: { numItems: 50, cursor: null },
    } : "skip"
  );
  
  const threads = cachedThreads || queriedThreads;
  
  // Memoize thread for header
  const threadForHeader = useMemo(() => 
    currentThread || threads?.page?.find((t: any) => t._id === activeThreadId),
    [currentThread, threads?.page, activeThreadId]
  );

  // Memoize cancel handler
  const handleCancel = useCallback(() => {
    window.location.reload()
  }, [])

  if (!activeThreadId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to zola.chat</h1>
          <p className="text-muted-foreground">
            Select a conversation or start a new one to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">
          {threadForHeader?.title || "New Chat"}
        </div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {uiMessages.map((message, index) => (
              <MemoizedMessage
                key={message.key}
                message={message}
                index={index}
                uiMessagesLength={uiMessages.length}
                onCopyMessage={handleCopyMessage}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
              />
            ))}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-2xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <PromptInputBox
          onSend={handleSubmit}
          isLoading={messages.isLoading || isStreaming}
          onCancel={handleCancel}
          placeholder="Ask anything..."
        />
      </div>
    </main>
  )
}

// Memoize the main component to prevent unnecessary re-renders
const MemoizedChatContent = memo(ChatContent);

export { MemoizedChatContent as ChatContent }
