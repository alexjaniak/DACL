#!/usr/bin/env bash
set -euo pipefail

# One-command subagent bootstrap:
# - creates a per-agent git worktree
# - configures git identity + SSH commit signing
# - generates a Solana wallet (if missing)
# - persists wallet metadata
#
# Usage:
#   ./scripts/setup-subagent.sh <agent-id> [repo-root]
# Example:
#   ./scripts/setup-subagent.sh dacl-agent-001 /path/to/DACL

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent-id> [repo-root]" >&2
  exit 1
fi

AGENT_ID="$1"
REPO_ROOT="${2:-$(pwd)}"
WORKTREE_PATH="${REPO_ROOT}/.worktrees/${AGENT_ID}"
METADATA_DIR="${REPO_ROOT}/agents/metadata"
METADATA_FILE="${METADATA_DIR}/${AGENT_ID}.json"
WALLET_DIR="${HOME}/.config/solana/dacl-agents"
WALLET_FILE="${WALLET_DIR}/${AGENT_ID}.json"

if ! git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: ${REPO_ROOT} is not a git repository" >&2
  exit 1
fi

mkdir -p "${WALLET_DIR}" "${METADATA_DIR}" "${REPO_ROOT}/.worktrees"

if [[ ! -d "${WORKTREE_PATH}" ]]; then
  git -C "${REPO_ROOT}" worktree add -b "${AGENT_ID}" "${WORKTREE_PATH}" main >/dev/null
fi

"${REPO_ROOT}/scripts/setup-agent-identity.sh" "${AGENT_ID}" "${WORKTREE_PATH}" >/dev/null

if [[ ! -f "${WALLET_FILE}" ]]; then
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "${TMPDIR}"' EXIT

  openssl genpkey -algorithm Ed25519 -out "${TMPDIR}/wallet.pem" >/dev/null 2>&1

  PRIV_HEX="$(openssl pkey -in "${TMPDIR}/wallet.pem" -text -noout | awk '/^priv:/{f=1;next}/^pub:/{f=0}f' | tr -d '[:space:]:' )"
  PUB_HEX="$(openssl pkey -in "${TMPDIR}/wallet.pem" -text -noout | awk '/^pub:/{f=1;next}f' | tr -d '[:space:]:' )"

  python3 - "${PRIV_HEX}" "${PUB_HEX}" "${WALLET_FILE}" <<'PY'
import json
import pathlib
import sys

priv = bytes.fromhex(sys.argv[1])
pub = bytes.fromhex(sys.argv[2])
out = pathlib.Path(sys.argv[3])
keypair = list(priv + pub)
out.write_text(json.dumps(keypair))
PY
fi

WALLET_PUBKEY="$(python3 - "${WALLET_FILE}" <<'PY'
import json
import sys

alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

def b58encode(data: bytes) -> str:
    n = int.from_bytes(data, 'big')
    encoded = ''
    while n:
        n, rem = divmod(n, 58)
        encoded = alphabet[rem] + encoded
    pad = 0
    for b in data:
        if b == 0:
            pad += 1
        else:
            break
    return '1' * pad + (encoded or '1')

with open(sys.argv[1], 'r', encoding='utf-8') as f:
    arr = json.load(f)
raw = bytes(arr)
pub = raw[32:64]
print(b58encode(pub))
PY
)"

cat > "${METADATA_FILE}" <<EOF
{
  "agentId": "${AGENT_ID}",
  "worktreePath": "${WORKTREE_PATH}",
  "git": {
    "name": "${AGENT_ID}",
    "email": "${AGENT_ID}@users.noreply.github.com"
  },
  "wallet": {
    "network": "solana",
    "keypairPath": "${WALLET_FILE}",
    "pubkey": "${WALLET_PUBKEY}"
  }
}
EOF

echo "✅ Subagent setup complete"
echo "agent id: ${AGENT_ID}"
echo "git identity: ${AGENT_ID} <${AGENT_ID}@users.noreply.github.com>"
echo "wallet pubkey: ${WALLET_PUBKEY}"
echo "worktree: ${WORKTREE_PATH}"
echo "metadata: ${METADATA_FILE}"
