#!/usr/bin/env bash
set -euo pipefail

# ── ensure cron has a sane environment ─────────────────────────
export HOME="${HOME:-$(eval echo ~)}"
export PATH="$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"

KERNEL_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── load .env if present (overrides, etc.) ─────────────────────
if [[ -f "$KERNEL_DIR/.env" ]]; then
  set -a
  source "$KERNEL_DIR/.env"
  set +a
fi
CONTEXT_FILE="$KERNEL_DIR/CONTEXT.md"
CLAUDE="${CLAUDE_BIN:-claude}"

# ── parse flags ────────────────────────────────────────────────
AGENTIC=false
PROMPT=""
for arg in "$@"; do
  case "$arg" in
    --agentic) AGENTIC=true ;;
    *)         PROMPT="$arg" ;;
  esac
done

# stdin fallback
if [[ -z "$PROMPT" ]] && [[ ! -t 0 ]]; then
  PROMPT="$(cat)"
fi

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 [--agentic] \"<prompt>\"" >&2
  exit 1
fi

# ── build claude args ─────────────────────────────────────────
CLAUDE_ARGS=()

if [[ "$AGENTIC" == false ]]; then
  CLAUDE_ARGS+=(--print)          # text-only, no tools
fi

CLAUDE_ARGS+=(--dangerously-skip-permissions)

if [[ -s "$CONTEXT_FILE" ]]; then
  CLAUDE_ARGS+=(--append-system-prompt "$(cat "$CONTEXT_FILE")")
fi

"$CLAUDE" "${CLAUDE_ARGS[@]}" "$PROMPT"
