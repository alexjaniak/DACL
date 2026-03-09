export interface Agent {
  id: string
  role: "planner" | "worker" | "unknown"
  interval: string
  agentic: boolean
  workspace: boolean
  contexts: string[]
  repo: string
  lastRun: string | null
  nextRun: string | null
}

export interface LogChunk {
  agentId: string
  lines: string[]
  totalLines: number
  lastModified: string | null
}

export interface DashboardData {
  agents: Agent[]
  updatedAt: string
}
