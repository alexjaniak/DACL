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
CLAUDE="${CLAUDE_BIN:-claude}"

# ── parse flags ────────────────────────────────────────────────
AGENTIC=false
PROMPT=""
CONTEXTS=()
WORKSPACE_ID=""
NEXT_IS_CONTEXT=false
NEXT_IS_WORKSPACE=false

for arg in "$@"; do
  if [[ "$NEXT_IS_CONTEXT" == true ]]; then
    CONTEXTS+=("$arg")
    NEXT_IS_CONTEXT=false
    continue
  fi
  if [[ "$NEXT_IS_WORKSPACE" == true ]]; then
    WORKSPACE_ID="$arg"
    NEXT_IS_WORKSPACE=false
    continue
  fi
  case "$arg" in
    --agentic)    AGENTIC=true ;;
    --context)    NEXT_IS_CONTEXT=true ;;
    --workspace)  NEXT_IS_WORKSPACE=true ;;
    *)            PROMPT="$arg" ;;
  esac
done

# stdin fallback
if [[ -z "$PROMPT" ]] && [[ ! -t 0 ]]; then
  PROMPT="$(cat)"
fi

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 [--agentic] [--workspace <id>] [--context <path> ...] \"<prompt>\"" >&2
  exit 1
fi

# ── workspace (git worktree) isolation ───────────────────────
if [[ -n "$WORKSPACE_ID" ]]; then
  WORKTREE_DIR="$REPO_DIR/.repos/$WORKSPACE_ID"

  # Create worktree if missing
  if [[ ! -d "$WORKTREE_DIR" ]]; then
    git -C "$REPO_DIR" worktree add "$WORKTREE_DIR" --detach main
  fi

  # Skip if another run is still active in this workspace
  LOCKFILE="$WORKTREE_DIR/.agent.lock"
  if [[ -f "$LOCKFILE" ]]; then
    OLD_PID=$(cat "$LOCKFILE" 2>/dev/null)
    if kill -0 "$OLD_PID" 2>/dev/null; then
      SYSTEM_LOG="$KERNEL_DIR/logs/system.log"
      mkdir -p "$(dirname "$SYSTEM_LOG")"
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $WORKSPACE_ID: skipped (pid $OLD_PID still running)" >> "$SYSTEM_LOG"
      exit 0
    fi
  fi

  # Acquire lock
  echo $$ > "$LOCKFILE"
  trap 'rm -f "$LOCKFILE"' EXIT
fi

# ── assemble system prompt from context files ─────────────────
SYSTEM_PROMPT=""

for ctx in "${CONTEXTS[@]}"; do
  CTX_PATH="$REPO_DIR/$ctx"
  if [[ ! -f "$CTX_PATH" ]]; then
    echo "Context not found: $ctx ($CTX_PATH)" >&2
    exit 1
  fi
  SYSTEM_PROMPT+=$'\n\n'"$(cat "$CTX_PATH")"
done

# ── inject agent identity ─────────────────────────────────────
if [[ -n "$WORKSPACE_ID" ]]; then
  SYSTEM_PROMPT="AGENT_ID: $WORKSPACE_ID"$'\n\n'"$SYSTEM_PROMPT"
fi

# ── build claude args ─────────────────────────────────────────
CLAUDE_ARGS=()

if [[ "$AGENTIC" == false ]]; then
  CLAUDE_ARGS+=(--print)          # text-only, no tools
fi

CLAUDE_ARGS+=(--dangerously-skip-permissions)

if [[ -n "$SYSTEM_PROMPT" ]]; then
  CLAUDE_ARGS+=(--append-system-prompt "$SYSTEM_PROMPT")
fi

if [[ -n "$WORKSPACE_ID" ]]; then
  cd "$WORKTREE_DIR"
fi

# ── run boundary marker (used by logs/view.sh to group output) ──
echo "=== RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

"$CLAUDE" "${CLAUDE_ARGS[@]}" "$PROMPT"
