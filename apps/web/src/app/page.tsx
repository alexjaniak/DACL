export default function Home() {
  return (
    <div className="grid h-screen grid-cols-[300px_1fr] grid-rows-[1fr_300px]">
      {/* Agent Panel — left sidebar */}
      <div className="row-span-2 border-r border-od-border bg-od-surface p-4">
        <h2 className="text-lg font-bold text-od-text-bright">Agents</h2>
        <p className="mt-2 text-sm text-od-text">Agent cards will go here</p>
      </div>

      {/* Logs Panel — center top */}
      <div className="border-b border-od-border bg-od-bg p-4">
        <h2 className="text-lg font-bold text-od-text-bright">Logs</h2>
        <p className="mt-2 text-sm text-od-text">Log viewer will go here</p>
      </div>

      {/* Events Panel — bottom right */}
      <div className="bg-od-bg p-4">
        <h2 className="text-lg font-bold text-od-text-bright">Events</h2>
        <p className="mt-2 text-sm text-od-text">Event feed will go here</p>
      </div>
    </div>
  );
}
