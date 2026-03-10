"""Agent status panel — live display of cron agent timing."""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from textual.app import ComposeResult
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Static


def _find_repo_root() -> Path:
    """Locate the repository root via env var or git."""
    env_root = os.environ.get("FORGE_REPO_ROOT")
    if env_root:
        return Path(env_root)
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(result.stdout.strip())
    except (subprocess.CalledProcessError, FileNotFoundError):
        return Path.cwd()


def _interval_seconds(interval: str) -> int:
    m = re.fullmatch(r"(\d+)m", interval)
    if m:
        return int(m.group(1)) * 60
    m = re.fullmatch(r"(\d+)h", interval)
    if m:
        return int(m.group(1)) * 3600
    return 0


def _infer_role(contexts: list[str]) -> str:
    for ctx in contexts:
        if "PLANNER" in ctx.upper():
            return "planner"
    return "worker"


def _format_delta(delta: timedelta) -> str:
    total = int(delta.total_seconds())
    if total <= 0:
        return "overdue"
    mins, secs = divmod(total, 60)
    hrs, mins = divmod(mins, 60)
    if hrs:
        return f"{hrs}h {mins}m {secs}s"
    if mins:
        return f"{mins}m {secs}s"
    return f"{secs}s"


def _load_agents(repo_root: Path) -> list[dict]:
    """Load agent info from cron-jobs.json merged with cron-state.json."""
    cron_dir = repo_root / "agent-kernel" / "cron"
    jobs_path = cron_dir / "cron-jobs.json"
    state_path = cron_dir / "cron-state.json"

    if not jobs_path.exists():
        return []

    with open(jobs_path) as f:
        config = json.load(f)

    state: dict = {}
    if state_path.exists():
        try:
            with open(state_path) as f:
                state = json.load(f).get("jobs", {})
        except (json.JSONDecodeError, KeyError):
            pass

    now = datetime.now(timezone.utc)
    agents = []
    for job in config.get("jobs", []):
        if not job.get("enabled", True):
            continue
        agent_id = job["id"]
        interval = job.get("interval", "?")
        contexts = job.get("contexts", [])
        role = _infer_role(contexts)
        repo = job.get("repo", "")

        job_state = state.get(agent_id, {})
        last_run_iso = job_state.get("last_run")

        if last_run_iso:
            try:
                last_dt = datetime.fromisoformat(last_run_iso)
                since = _format_delta(now - last_dt)
                secs = _interval_seconds(interval)
                if secs:
                    next_dt = last_dt + timedelta(seconds=secs)
                    until = _format_delta(next_dt - now)
                else:
                    until = "—"
            except (ValueError, TypeError):
                since = "error"
                until = "—"
        else:
            since = "no data"
            until = "—"

        agents.append({
            "id": agent_id,
            "role": role,
            "repo": repo or "(self)",
            "interval": interval,
            "since": since,
            "until": until,
        })

    return agents


class StatusPanel(Widget):
    """Live-updating agent status panel."""

    tick_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static("Agent Status", id="status-header")
        yield Static("Loading...", id="status-content")

    def on_mount(self) -> None:
        self._repo_root = _find_repo_root()
        self._refresh_display()
        self.set_interval(5, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_display()

    def _refresh_display(self) -> None:
        agents = _load_agents(self._repo_root)
        content = self.query_one("#status-content", Static)
        if not agents:
            content.update("No agents configured.")
            return

        lines: list[str] = []
        for a in agents:
            lines.append(
                f"[bold]{a['id']}[/bold]  ({a['role']})\n"
                f"  repo: {a['repo']}  interval: {a['interval']}\n"
                f"  last run: {a['since']} ago  next: {a['until']}"
            )
        content.update("\n\n".join(lines))
