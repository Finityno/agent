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
import { ResponseStream } from "./ui/response-stream"
import { useRef, memo, useMemo } from "react"
import { useMutation } from "convex/react"
import { useQuery } from "convex-helpers/react/cache";
import { api } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import {
  useThreadMessages,
  toUIMessages,
} from "@convex-dev/agent/react"

interface ChatContentProps {
  activeThreadId: Id<"threads"> | null;
  setActiveThreadId: (id: Id<"threads"> | null, uuid?: string) => void;
}

// Memoized Message component to prevent unnecessary re-renders
const MemoizedMessage = memo(({ message, index, uiMessagesLength }: {
  message: any;
  index: number;
  uiMessagesLength: number;
}) => {
  const isAssistant = message.role !== "user"
  const isLastMessage = index === uiMessagesLength - 1
  const displayContent = message.content;

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
          {(message as any).isStreaming ? (
            <div className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 ai-message-content">
              <ResponseStream textStream={displayContent} as="div" />
            </div>
          ) : (
            <MessageContent
              className="text-foreground prose flex-1 rounded-lg bg-transparent p-0 ai-message-content"
              markdown
            >
              {displayContent}
            </MessageContent>
          )}
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
                onClick={() =>
                  navigator.clipboard.writeText(message.content)
                }
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
        </div>
      ) : (
        <div className="group flex flex-col items-end gap-1">
          <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
            {message.content}
          </MessageContent>
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
              >
                <Pencil />
              </Button>
            </MessageAction>
            <MessageAction tooltip="Delete" delayDuration={100}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Trash />
              </Button>
            </MessageAction>
            <MessageAction tooltip="Copy" delayDuration={100}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() =>
                  navigator.clipboard.writeText(message.content)
                }
              >
                <Copy />
              </Button>
            </MessageAction>
          </MessageActions>
        </div>
      )}
    </Message>
  );
});

MemoizedMessage.displayName = "MemoizedMessage";

function ChatContent({ activeThreadId, setActiveThreadId }: ChatContentProps) {
  const threadMessagesOptions = useMemo(
    () => ({ initialNumItems: 10, stream: true }),
    [],
  );
  const messages = useThreadMessages(
    api.chatStreaming.listThreadMessages,
    activeThreadId ? { threadId: activeThreadId } : "skip",
    threadMessagesOptions,
  );
  const sendMessageAndUpdateThread = useMutation(
    api.chatStreaming.sendMessageAndUpdateThread,
  ).withOptimisticUpdate((store, args) => {
    const { threadId, prompt } = args;
    const existingMessages = store.getQuery(api.chatStreaming.listThreadMessages, {
      threadId,
      paginationOpts: { numItems: 10, cursor: null },
    });
    if (existingMessages) {
      store.setQuery(
        api.chatStreaming.listThreadMessages,
        {
          threadId,
          paginationOpts: { numItems: 10, cursor: null },
        },
        {
          ...existingMessages,
          page: [
            ...existingMessages.page,
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
              ],
              key: "optimistic-" + Date.now(),
              message: {
                _id: `optimistic-${Date.now()}` as Id<"messages">,
                _creationTime: Date.now(),
                body: prompt,
                threadId,
                isOptimistic: true,
              },
            },
          ],
        },
      );
    }
    const existing = store.getQuery(api.threads.listThreadsByUserId, {
      paginationOpts: { numItems: 50, cursor: null },
    });
    if (existing) {
      const existingThread = existing.page.find((t: any) => t._id === args.threadId);
      if (existingThread) {
        store.setQuery(
          api.threads.listThreadsByUserId,
          { paginationOpts: { numItems: 50, cursor: null } },
          {
            ...existing,
            page: existing.page.map((t: any) =>
              t._id === args.threadId
                ? {
                    ...t,
                    updatedAt: Date.now(),
                    title: args.isFirstMessage
                      ? args.prompt.length > 50
                        ? args.prompt.substring(0, 47) + "..."
                        : args.prompt
                      : t.title,
                  }
                : t,
            ),
          },
        );
      }
    }
  });
  const createThread = useMutation(api.chatStreaming.createThread);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (prompt: string) => {
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

    if (isFirstMessage) {
      // Logic for title generation can be handled here if needed
    }
  };

  const uiMessages = toUIMessages(messages?.results ?? []);

  // Get current thread info for header
  const threads = useQuery(api.threads.listThreadsByUserId, {
    paginationOpts: { numItems: 50, cursor: null },
  });
  const currentThread = threads?.page.find(
    (t: any) => t._id === activeThreadId,
  );

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
          {currentThread?.title || "New Chat"}
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
          isLoading={messages.isLoading}
          onCancel={() => window.location.reload()}
          placeholder="Ask anything..."
        />
      </div>
    </main>
  )
}

// Memoize the main component to prevent unnecessary re-renders
const MemoizedChatContent = memo(ChatContent);

export { MemoizedChatContent as ChatContent }
