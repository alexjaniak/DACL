#!/usr/bin/env bash
set -euo pipefail

# Create a new agent workspace with git identity + Solana wallet metadata.
#
# Usage:
#   ./scripts/create-subagent.sh <agent-id>
# Example:
#   ./scripts/create-subagent.sh dacl-agent-001

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-id>" >&2
  exit 1
fi

AGENT_ID="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE_DIR="${ROOT_DIR}/.worktrees/${AGENT_ID}"
WALLET_DIR="${ROOT_DIR}/agents/wallets"
META_DIR="${ROOT_DIR}/agents/meta"
WALLET_FILE="${WALLET_DIR}/${AGENT_ID}.json"
META_FILE="${META_DIR}/${AGENT_ID}.json"

mkdir -p "${WALLET_DIR}" "${META_DIR}" "${ROOT_DIR}/.worktrees"

if [[ ! -d "${WORKTREE_DIR}" ]]; then
  git -C "${ROOT_DIR}" worktree add -b "${AGENT_ID}" "${WORKTREE_DIR}" main
fi

"${ROOT_DIR}/scripts/setup-agent-identity.sh" "${AGENT_ID}" "${WORKTREE_DIR}" >/tmp/${AGENT_ID}_identity.out

if ! command -v solana-keygen >/dev/null 2>&1; then
  echo "Error: solana-keygen not found. Install Solana CLI first." >&2
  echo "Hint: https://docs.solana.com/cli/install-solana-cli-tools" >&2
  exit 2
fi

if [[ ! -f "${WALLET_FILE}" ]]; then
  solana-keygen new --no-bip39-passphrase --force -o "${WALLET_FILE}" >/dev/null
fi

WALLET_PUBKEY="$(solana-keygen pubkey "${WALLET_FILE}")"

cat > "${META_FILE}" <<EOF
{
  "agentId": "${AGENT_ID}",
  "worktree": "${WORKTREE_DIR}",
  "gitName": "${AGENT_ID}",
  "gitEmail": "${AGENT_ID}@users.noreply.github.com",
  "walletFile": "${WALLET_FILE}",
  "walletPubkey": "${WALLET_PUBKEY}"
}
EOF

echo "✅ Subagent ready"
echo "agent:        ${AGENT_ID}"
echo "worktree:     ${WORKTREE_DIR}"
echo "git identity: ${AGENT_ID} <${AGENT_ID}@users.noreply.github.com>"
echo "wallet:       ${WALLET_PUBKEY}"
echo "metadata:     ${META_FILE}"
