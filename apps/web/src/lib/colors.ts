const AGENT_COLORS = [
  "#61afef", // blue
  "#98c379", // green
  "#e5c07b", // yellow
  "#e06c75", // red
  "#c678dd", // magenta
  "#56b6c2", // cyan
  "#d19a66", // orange
];

export function getAgentColor(agentId: string): string {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash += agentId.charCodeAt(i);
  }
  return AGENT_COLORS[hash % AGENT_COLORS.length];
}
