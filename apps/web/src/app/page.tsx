import { AgentPanel } from "@/components/agent-panel";
import { LogsPanel } from "@/components/logs-panel";
import { EventsPanel } from "@/components/events-panel";
import { ResizableLayout } from "@/components/resizable-layout";

export default function Home() {
  return (
    <ResizableLayout
      sidebar={<AgentPanel />}
      topRight={<LogsPanel />}
      bottomRight={<EventsPanel />}
    />
  );
}
