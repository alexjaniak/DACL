import { AgentPanel } from "@/components/agent-panel";
import { LogsPanel } from "@/components/logs-panel";

export default function Home() {
  return (
    <div className="grid grid-cols-[300px_1fr] grid-rows-[1fr_300px] h-screen gap-px bg-border">
      {/* Agent Panel — left sidebar */}
      <AgentPanel />

      {/* Logs Panel — top right */}
      <div className="bg-background overflow-hidden">
        <LogsPanel />
      </div>

      {/* Events Panel — bottom right */}
      <div className="bg-surface p-4 overflow-y-auto">
        <h2 className="text-text-bright font-semibold text-sm uppercase tracking-wide mb-4">
          Events
        </h2>
        <p className="text-muted-foreground text-sm">
          Event feed will appear here.
        </p>
      </div>
    </div>
  );
}
