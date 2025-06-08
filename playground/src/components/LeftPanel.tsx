import React from "react";
import ThreadList from "./ThreadList";
import { Thread } from "../types";
import { Button } from "./ui/button";
import { Header } from "./Header";
import { ScrollArea } from "./ui/scroll-area";

interface LeftPanelProps {
  threads: Thread[];
  selectedThreadId?: string;
  onSelectThread: (thread: Thread) => void;
  onLoadMoreThreads: (numItems: number) => void;
  canLoadMoreThreads: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  threads,
  selectedThreadId,
  onSelectThread,
  onLoadMoreThreads,
  canLoadMoreThreads,
}) => {
  return (
    <div className="flex flex-col h-full border-r">
      <Header />
      <ScrollArea className="flex-1">
        <div className="panel-content p-4">
          <ThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelectThread={onSelectThread}
            onLoadMore={() => onLoadMoreThreads(10)}
          />
          {canLoadMoreThreads && (
            <Button variant="outline" onClick={() => onLoadMoreThreads(10)}>
              Load More
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LeftPanel;
