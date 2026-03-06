#!/usr/bin/env bash
set -euo pipefail

# ── ensure cron has a sane environment ─────────────────────────
export HOME="${HOME:-$(eval echo ~)}"
export PATH="$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"

KERNEL_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$KERNEL_DIR/.." && pwd)"

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
CONTEXTS=()
NEXT_IS_CONTEXT=false

for arg in "$@"; do
  if [[ "$NEXT_IS_CONTEXT" == true ]]; then
    CONTEXTS+=("$arg")
    NEXT_IS_CONTEXT=false
    continue
  fi
  case "$arg" in
    --agentic) AGENTIC=true ;;
    --context) NEXT_IS_CONTEXT=true ;;
    *)         PROMPT="$arg" ;;
  esac
done

# stdin fallback
if [[ -z "$PROMPT" ]] && [[ ! -t 0 ]]; then
  PROMPT="$(cat)"
fi

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 [--agentic] [--context <path> ...] \"<prompt>\"" >&2
  exit 1
fi

# ── assemble system prompt from context files ─────────────────
SYSTEM_PROMPT=""

if [[ -s "$CONTEXT_FILE" ]]; then
  SYSTEM_PROMPT="$(cat "$CONTEXT_FILE")"
fi

for ctx in "${CONTEXTS[@]}"; do
  CTX_PATH="$REPO_DIR/$ctx"
  if [[ ! -f "$CTX_PATH" ]]; then
    echo "Context not found: $ctx ($CTX_PATH)" >&2
    exit 1
  fi
  SYSTEM_PROMPT+=$'\n\n'"$(cat "$CTX_PATH")"
done

# ── build claude args ─────────────────────────────────────────
CLAUDE_ARGS=()

if [[ "$AGENTIC" == false ]]; then
  CLAUDE_ARGS+=(--print)          # text-only, no tools
fi

CLAUDE_ARGS+=(--dangerously-skip-permissions)

if [[ -n "$SYSTEM_PROMPT" ]]; then
  CLAUDE_ARGS+=(--append-system-prompt "$SYSTEM_PROMPT")
fi

"$CLAUDE" "${CLAUDE_ARGS[@]}" "$PROMPT"
