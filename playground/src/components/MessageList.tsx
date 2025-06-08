import React, { useMemo, useState, useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import { Message, User } from '../types';
import { toUIMessages } from '@convex-dev/agent/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

interface MessageListProps {
  users: User[];
  messages: Message[];
  selectedMessageId: string | undefined;
  onSelectMessage: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  users,
  messages,
  selectedMessageId,
  onSelectMessage,
}) => {
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uiMessages = useMemo(() => {
    // TODO: segment the messages by "order" so the message item can show all of
    // the messages that have been grouped together. Right now you can only see
    // the latest message in the group / send messages to it.
    const uiMessages = toUIMessages([...messages].reverse());
    return uiMessages.map((uiMessage) => {
      const message =
        messages.find((message) => message._id === uiMessage.id) ??
        messages.find((m) => m.id === uiMessage.id)!;
      uiMessage.id = message._id;
      return {
        ...message,
        message: uiMessage,
      };
    });
  }, [messages]);

  const handleSelectToolCall = (toolCallId: string) => {
    setSelectedToolCallId(
      selectedToolCallId === toolCallId ? null : toolCallId,
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Add messages as a dependency

  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto p-4 space-y-4">
      {uiMessages.map((message) => {
        const user = users.find((user) => user._id === message.userId);
        const isUser = user?.name === 'user';
        return (
          <div
            key={message._id}
            className={cn(
              'flex items-start gap-4',
              isUser ? 'justify-end' : '',
            )}
          >
            {!isUser && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>
                  {user?.name?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <Card
              className={cn(
                'max-w-prose',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
              )}
            >
              <CardContent className="p-3">
                <MessageItem
                  user={user}
                  message={message}
                  isSelected={message._id === selectedMessageId}
                  onClick={() => {
                    onSelectMessage(message._id);
                    setSelectedToolCallId(null);
                  }}
                  onSelectToolCall={handleSelectToolCall}
                  selectedToolCallId={selectedToolCallId}
                />
              </CardContent>
            </Card>
            {isUser && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}
      {/* Add an invisible div at the bottom to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
