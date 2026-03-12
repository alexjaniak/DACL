import { EventsPanel } from "@/components/events-panel";

export default function Home() {
  return (
    <div className="grid grid-cols-[300px_1fr] grid-rows-[1fr_300px] h-screen gap-px bg-border">
      {/* Agent Panel — left sidebar */}
      <div className="row-span-2 bg-surface p-4 overflow-y-auto">
        <h2 className="text-text-bright font-semibold text-sm uppercase tracking-wide mb-4">
          Agents
        </h2>
        <p className="text-muted-foreground text-sm">
          Agent list will appear here.
        </p>
      </div>

      {/* Logs Panel — top right */}
      <div className="bg-background p-4 overflow-y-auto">
        <h2 className="text-text-bright font-semibold text-sm uppercase tracking-wide mb-4">
          Logs
        </h2>
        <p className="text-muted-foreground text-sm">
          Log output will appear here.
        </p>
      </div>

      {/* Events Panel — bottom right */}
      <EventsPanel />
    </div>
  );
}
