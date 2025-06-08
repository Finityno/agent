import React from 'react';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import { Agent, Message, User, ContextOptions, StorageOptions } from '../types';

interface ChatPanelProps {
  users: User[];
  messages: Message[];
  selectedMessageId: string | undefined;
  onSelectMessage: (messageId: string) => void;
  agents: Agent[] | undefined;
  selectedAgent: Agent | undefined;
  setSelectedAgent: (agent: Agent) => void;
  contextOptions: ContextOptions;
  setContextOptions: (contextOptions: ContextOptions) => void;
  storageOptions: StorageOptions;
  setStorageOptions: (storageOptions: StorageOptions) => void;
  onSendMessage: (
    message: string,
    agentName: string,
    context: ContextOptions | undefined,
    storage: StorageOptions | undefined,
    systemPrompt?: string,
  ) => Promise<string | undefined>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  users,
  messages,
  selectedMessageId,
  onSelectMessage,
  agents,
  selectedAgent,
  setSelectedAgent,
  contextOptions,
  setContextOptions,
  storageOptions,
  setStorageOptions,
  onSendMessage,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <MessageList
          users={users}
          messages={messages}
          selectedMessageId={selectedMessageId}
          onSelectMessage={onSelectMessage}
        />
      </div>
      <div className="border-t">
        <MessageComposer
          agents={agents}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          contextOptions={contextOptions}
          setContextOptions={setContextOptions}
          storageOptions={storageOptions}
          setStorageOptions={setStorageOptions}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
};

export default ChatPanel;