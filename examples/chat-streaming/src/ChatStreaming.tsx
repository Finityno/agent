"use client"

import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { ChatSidebar } from "./components/ChatSidebar"
import { ChatContent } from "./components/ChatContent"
import { Toaster } from "./components/ui/toaster";

function FullChatApp() {
  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarInset>
        <ChatContent />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function ChatStreaming() {
    return (
        <>
            <FullChatApp />
            <Toaster />
        </>
    )
}
