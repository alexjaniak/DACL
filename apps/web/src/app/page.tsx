import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Agent Panel - Left Sidebar */}
      <aside className="flex w-1/4 min-w-[250px] flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-bright">Agents</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Agent cards</p>
        </div>
        <div className="border-t border-border p-3">
          <Button variant="outline" size="sm" className="w-full">
            Force Run
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Logs Panel - Main */}
        <main className="flex-1 border-b border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-bright">Logs</h2>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">Log entries</p>
          </div>
        </main>

        {/* Events Panel - Bottom Bar */}
        <footer className="h-[200px] bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-bright">Events</h2>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-sm text-muted-foreground">GitHub events</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
