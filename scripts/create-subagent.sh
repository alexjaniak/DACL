#!/usr/bin/env bash
set -euo pipefail

# Deprecated compatibility wrapper.
# Canonical entrypoint is scripts/setup-subagent.sh.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "${SCRIPT_DIR}/setup-subagent.sh" "$@"
