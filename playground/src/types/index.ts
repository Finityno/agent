import {
  ContextOptions as AgentContextOptions,
  MessageDoc,
  StorageOptions as AgentStorageOptions,
  ThreadDoc,
} from '@convex-dev/agent';

export type ContextOptions = AgentContextOptions;

export type StorageOptions = AgentStorageOptions & {
  save?: "all" | "none" | "promptAndOutput";
};

export interface Agent {
  name: string;
  instructions: string | undefined;
  contextOptions: ContextOptions | undefined;
  storageOptions: StorageOptions | undefined;
  maxSteps: number | undefined;
  maxRetries: number | undefined;
  tools: string[];
}

export interface User {
  _id: string;
  name: string;
  imageUrl?: string;
}

export type Thread = ThreadDoc & {
  latestMessage?: string;
  lastMessageAt?: number;
};

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  returnValue?: any;
}

export type Message = MessageDoc;

export type ContextMessage = MessageDoc & {
  vectorSearchRank?: number;
  textSearchRank?: number;
  hybridSearchRank?: number;
};
