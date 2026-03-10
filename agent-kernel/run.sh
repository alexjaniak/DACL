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
TARGET_REPO=""
NEXT_IS_CONTEXT=false
NEXT_IS_WORKSPACE=false
NEXT_IS_REPO=false

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
  if [[ "$NEXT_IS_REPO" == true ]]; then
    TARGET_REPO="$arg"
    NEXT_IS_REPO=false
    continue
  fi
  case "$arg" in
    --agentic)    AGENTIC=true ;;
    --context)    NEXT_IS_CONTEXT=true ;;
    --workspace)  NEXT_IS_WORKSPACE=true ;;
    --repo)       NEXT_IS_REPO=true ;;
    *)            PROMPT="$arg" ;;
  esac
done

# stdin fallback
if [[ -z "$PROMPT" ]] && [[ ! -t 0 ]]; then
  PROMPT="$(cat)"
fi

if [[ -z "$PROMPT" ]]; then
  echo "Usage: $0 [--agentic] [--workspace <id>] [--repo <path-or-url>] [--context <path> ...] \"<prompt>\"" >&2
  exit 1
fi

# ── resolve target repo ──────────────────────────────────────
# When --repo is provided, the worktree is created under the target repo
# instead of DACL's own repo. Context files still resolve from DACL's REPO_DIR.
WORK_REPO_DIR="$REPO_DIR"

if [[ -n "$TARGET_REPO" ]]; then
  if [[ "$TARGET_REPO" == /* ]]; then
    # Absolute local path — use directly
    WORK_REPO_DIR="$TARGET_REPO"
  elif [[ "$TARGET_REPO" == github.com/* ]]; then
    # GitHub URL — clone into .repos/ under DACL root
    LOCAL_CLONE="$REPO_DIR/.repos/$TARGET_REPO"
    if [[ -d "$LOCAL_CLONE/.git" ]]; then
      git -C "$LOCAL_CLONE" pull --ff-only 2>/dev/null || true
    else
      mkdir -p "$(dirname "$LOCAL_CLONE")"
      # Convert github.com/owner/repo to git@github.com:owner/repo.git
      SSH_URL="git@$(echo "$TARGET_REPO" | sed 's|/|:|1')"
      git clone "$SSH_URL.git" "$LOCAL_CLONE"
    fi
    WORK_REPO_DIR="$LOCAL_CLONE"
  else
    # Relative or other path — treat as local path
    WORK_REPO_DIR="$TARGET_REPO"
  fi
fi

# ── workspace (git worktree) isolation ───────────────────────
if [[ -n "$WORKSPACE_ID" ]]; then
  WORKTREE_DIR="$WORK_REPO_DIR/.worktrees/$WORKSPACE_ID"

  # Create worktree if missing
  if [[ ! -d "$WORKTREE_DIR" ]]; then
    git -C "$WORK_REPO_DIR" worktree add "$WORKTREE_DIR" --detach main
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

# ── preflight: skip idle worker runs ─────────────────────────
IS_WORKER=false
for ctx in "${CONTEXTS[@]}"; do
  if [[ "$ctx" == *WORKER.md ]]; then
    IS_WORKER=true
    break
  fi
done

if [[ "$IS_WORKER" == true ]]; then
  GH_ARGS=(issue list --label "status:ready-for-work" --label "role:worker" --json number --jq 'length')

  if [[ "$TARGET_REPO" == github.com/* ]]; then
    GH_REPO="${TARGET_REPO#github.com/}"
    GH_ARGS+=(--repo "$GH_REPO")
  fi

  AVAILABLE=$(gh "${GH_ARGS[@]}" 2>/dev/null || echo "error")

  if [[ "$AVAILABLE" == "0" ]]; then
    echo "=== RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
    echo "No issues with status:ready-for-work + role:worker — skipping run"
    echo "=== END RUN ==="
    exit 0
  fi
  # If gh fails (network error, etc.), proceed with the run rather than skipping
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

# ── update last_run in cron-state.json ────────────────────────
# Records the current UTC timestamp so the CLI status command can show
# when each agent last ran and compute countdown to next run.
if [[ -n "$WORKSPACE_ID" ]]; then
  STATE_JSON="$KERNEL_DIR/cron/cron-state.json"
  if [[ -f "$STATE_JSON" ]]; then
    python3 -c "
import json, sys
from datetime import datetime, timezone
f = sys.argv[1]
agent = sys.argv[2]
with open(f) as fh:
    state = json.load(fh)
if agent in state.get('jobs', {}):
    state['jobs'][agent]['last_run'] = datetime.now(timezone.utc).isoformat()
    with open(f, 'w') as fh:
        json.dump(state, fh, indent=2)
        fh.write('\n')
" "$STATE_JSON" "$WORKSPACE_ID" 2>/dev/null || true
  fi
fi

# ── run boundary marker (used by logs/view.sh to group output) ──
echo "=== RUN $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

rc=0
"$CLAUDE" "${CLAUDE_ARGS[@]}" "$PROMPT" || rc=$?

echo "=== END RUN ==="
exit "$rc"
