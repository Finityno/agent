import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from './ui/resizable';
import LeftPanel from './LeftPanel';
import { usePlayground } from '../hooks/usePlayground';

export function Playground() {
  const {
    threads,
    selectedThread,
    loadMoreThreads,
    canLoadMoreThreads,
    selectThread,
  } = usePlayground();

  return (
    <div className="flex flex-col h-screen">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20}>
          <LeftPanel
            threads={threads}
            selectedThreadId={selectedThread?._id}
            onSelectThread={selectThread}
            onLoadMoreThreads={loadMoreThreads}
            canLoadMoreThreads={canLoadMoreThreads}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <div className="p-4 h-full">
            <h2 className="font-semibold">Chat</h2>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30}>
          <div className="p-4 h-full">
            <h2 className="font-semibold">Tools</h2>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}