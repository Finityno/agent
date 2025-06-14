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
import { MessageAttachment } from "./MessageAttachment"
import ImageGeneration from "./ai-imagegenerator"
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
} from "../lib/agent-react"

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
  threadAttachments,
}: {
  message: any;
  index: number;
  uiMessagesLength: number;
  onCopyMessage: (content: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  threadAttachments?: Array<{
    messageBody: string;
    attachments: string[]; // Storage IDs as strings
    _creationTime: number;
  }>;
}) => {
  const isAssistant = message.role !== "user"
  const isLastMessage = index === uiMessagesLength - 1
  
  // Always use useSmoothText for assistant messages - the hook will automatically
  // detect when content is changing and apply smooth animation
  const [smoothedContent] = useSmoothText(isAssistant ? (message.content || "") : "")
  
  // For assistant messages, use smoothed content; for user messages, use original content
  const displayContent = isAssistant ? smoothedContent : message.content

  // Extract attachments for this message from threadAttachments
  const attachments = useMemo(() => {
    if (!threadAttachments || !message.content || isAssistant) {
      return []; // Only show attachments for user messages
    }
    
    // Find matching attachment record by message content or closest timestamp
    let matchingAttachment = threadAttachments.find(att => 
      att.messageBody === message.content || 
      message.content.includes(att.messageBody)
    );
    
    // If no exact match, try to find by timestamp proximity (for user messages)
    if (!matchingAttachment && message._creationTime) {
      const sortedAttachments = [...threadAttachments].sort((a, b) => 
        Math.abs(a._creationTime - message._creationTime) - Math.abs(b._creationTime - message._creationTime)
      );
      
      // Only use timestamp matching if the message is recent and we have a close timestamp match
      const closest = sortedAttachments[0];
      if (closest && Math.abs(closest._creationTime - message._creationTime) < 5000) { // 5 second tolerance
        matchingAttachment = closest;
      }
    }
    
    return matchingAttachment ? matchingAttachment.attachments : [];
  }, [message.content, message._creationTime, threadAttachments, isAssistant]);

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
        <div className="group flex w-full flex-col gap-2">
          <MessageContent
            className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 ai-message-content"
            markdown
          >
            {displayContent}
          </MessageContent>
          {assistantActions}
        </div>
      ) : (
        <div className="group flex flex-col items-end gap-2">
          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
            {displayContent}
          </MessageContent>
          
          {/* Display attachments for user messages */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 max-w-[85%] sm:max-w-[75%]">
              {attachments.map((storageId, index) => (
                <MessageAttachment 
                  key={`${message.key}-attachment-${index}`}
                  storageId={storageId as Id<"_storage">}
                />
              ))}
            </div>
          )}
          
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
  
  // Fetch attachment associations for this thread
  const threadAttachments = useConvexQuery(
    api.chatStreaming.getThreadAttachments,
    activeThreadId ? { threadId: activeThreadId } : "skip"
  );
  
    // Memoize mutations with optimistic updates for instant message display
  const sendMessage = useMutation(api.chatStreaming.sendMessage)
    .withOptimisticUpdate((store, args) => {
      const { threadId, prompt } = args;
      
      // Get ALL queries for this function and find the one for this thread
      const allQueries = store.getAllQueries(api.chatStreaming.listThreadMessages);
      
      // Find queries for this specific thread
      const threadQueries = allQueries.filter(q => 
        q.args && q.args.threadId === threadId.toString()
      );
      
      if (threadQueries.length > 0) {
        const { args: queryArgs, value } = threadQueries[0];
        
        if (value && value.page) {
          // Create optimistic user message
          const optimisticMessage = {
            _id: `optimistic-${Date.now()}`,
            _creationTime: Date.now(),
            userId: "current-user",
            threadId,
            role: "user" as const,
            content: prompt,
            status: "success" as const,
            tool: false,
            order: value.page.length,
            stepOrder: 0,
          };

          // Update the store with the exact query args that were found
          store.setQuery(api.chatStreaming.listThreadMessages, queryArgs, {
            ...value,
            page: [...value.page, optimisticMessage]
          });
        }
      }
    });
  
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
  const handleSubmit = useCallback(async (prompt: string, attachmentIds?: string[], modelId?: string) => {
    if (!prompt.trim()) return;

    let threadId = activeThreadId;

    // Create a new thread if none is active
    if (!threadId) {
      threadId = await createThread() as Id<"threads">;
      // Set the active thread ID immediately so the UI updates
      setActiveThreadId(threadId);
    }

    // Send message with optimistic updates - user sees message immediately
    sendMessage({
      prompt: prompt.trim(),
      threadId,
      modelId: modelId || "gpt-4.1-nano", // Default model if not specified
      attachmentIds: attachmentIds as any || [], // Pass storage IDs directly
    });
  }, [activeThreadId, createThread, setActiveThreadId, sendMessage]);

  // Memoize UI messages transformation
  const uiMessages = useMemo(() => toUIMessages(messages?.results ?? []), [messages?.results]);

  // Determine if we're currently streaming
  const isStreaming = messages.isLoading && uiMessages.length > 0;
  
  // Check if we're currently generating an image
  const isGeneratingImage = useMemo(() => {
    if (!isStreaming || uiMessages.length === 0) return false;
    
    // Look for the last user message to see if it was an image generation request
    const lastUserMessage = [...uiMessages].reverse().find(msg => msg.role === "user");
    if (!lastUserMessage) return false;
    
    // Check if there's a corresponding assistant message yet
    const messagesAfterUser = uiMessages.slice(uiMessages.indexOf(lastUserMessage) + 1);
    const hasAssistantResponse = messagesAfterUser.some(msg => msg.role !== "user");
    
    // We're generating an image if the last user message doesn't have an assistant response yet
    // and we're currently streaming (which indicates processing)
    return !hasAssistantResponse && isStreaming;
  }, [uiMessages, isStreaming]);

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
                threadAttachments={threadAttachments}
              />
            ))}
            
            {/* Show image generation loading when generating */}
            {isGeneratingImage && (
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-6 items-start">
                <div className="group flex w-full flex-col gap-2">
                  <ImageGeneration>
                    <div className="w-full aspect-square flex items-center justify-center min-h-[256px] bg-gray-100 dark:bg-gray-800">
                      <span className="text-gray-500 dark:text-gray-400">Generating image...</span>
                    </div>
                  </ImageGeneration>
                </div>
              </div>
            )}
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
