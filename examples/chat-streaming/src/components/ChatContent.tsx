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
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { useTextStream } from "./ui/response-stream"
import { Doc, Id } from "../../convex/_generated/dataModel"
import {
  useThreadMessages,
  toUIMessages,
  optimisticallySendMessage,
} from "@convex-dev/agent/react"

function ChatContent() {
  const [threadId, setThreadId] = useState<Id<"threads"> | undefined>()
  const createThread = useMutation(api.chatStreaming.createThread)
  useEffect(() => {
    const create = async () => {
      const newThreadId = await createThread()
      setThreadId(newThreadId as Id<"threads">)
    }
    if (!threadId) {
      create()
    }
  }, [createThread, threadId])
  const messages = useThreadMessages(
    api.chatStreaming.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 10, stream: true },
  )
  const sendMessage = useMutation(
    api.chatStreaming.streamStoryAsynchronously,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.chatStreaming.listThreadMessages),
  )

  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || !threadId) return

    await sendMessage({ prompt: prompt.trim(), threadId })
  }

  const uiMessages = toUIMessages(messages.results ?? [])

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">Project roadmap discussion</div>
      </header>

      <div ref={chatContainerRef} className="relative flex-1 overflow-y-auto">
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {uiMessages.map((message, index) => {
              const isAssistant = message.role !== "user"
              const isLastMessage = index === uiMessages.length - 1

              return (
                <Message
                  key={message.key}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end",
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      <MessageContent
                        className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                        markdown
                      >
                        {message.content}
                      </MessageContent>
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
              )
            })}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <PromptInputBox
          onSend={handleSubmit}
          isLoading={messages.isLoading}
          placeholder="Ask anything..."
        />
      </div>
    </main>
  )
}

export { ChatContent }