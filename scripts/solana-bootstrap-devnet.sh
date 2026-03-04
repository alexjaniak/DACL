#!/usr/bin/env bash
set -euo pipefail

# Wrapper that keeps RPC URL out of source and enforces provisioner identity.
# Requires rust toolchain when executed.

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <agent-id> <agent-wallet-pubkey>" >&2
  exit 1
fi

AGENT_ID="$1"
AGENT_WALLET_PUBKEY="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
CONFIG_PATH="${DACL_SOLANA_CONFIG_PATH:-${REPO_ROOT}/config/solana.devnet.json}"
ACTOR_AGENT_ID="${DACL_PROVISIONER_AGENT_ID:-$(git -C "${REPO_ROOT}" config user.name || true)}"
PAYER_KEYPAIR="${DACL_SOLANA_PAYER_KEYPAIR:?set DACL_SOLANA_PAYER_KEYPAIR}"
MINT_AUTHORITY_KEYPAIR="${DACL_SOLANA_MINT_AUTHORITY_KEYPAIR:-${PAYER_KEYPAIR}}"

if ! command -v cargo >/dev/null 2>&1; then
  echo "Missing dependency: cargo (Rust toolchain). Install Rust to run bootstrap." >&2
  exit 2
fi

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Missing config: ${CONFIG_PATH}. Copy config/solana.devnet.example.json to config/solana.devnet.json and customize." >&2
  exit 1
fi

cargo run --manifest-path "${REPO_ROOT}/rust-sdk/dacl-solana-sdk/Cargo.toml" --bin dacl-solana-bootstrap -- \
  "${CONFIG_PATH}" \
  "${ACTOR_AGENT_ID}" \
  "${PAYER_KEYPAIR}" \
  "${MINT_AUTHORITY_KEYPAIR}" \
  "${AGENT_ID}=${AGENT_WALLET_PUBKEY}"
