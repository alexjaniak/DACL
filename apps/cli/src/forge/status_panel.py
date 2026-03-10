"""Agent status panel — live display of cron agent timing."""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import ProgressBar, Static


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


def _is_agent_running(repo_root: Path, agent_id: str, repo: str) -> bool:
    """Check if an agent is currently running by inspecting its lock file.

    Returns True only if the lock file exists and the PID inside is alive.
    """
    if repo and repo.startswith("github.com/"):
        worktree_base = repo_root / ".repos" / repo
    else:
        worktree_base = repo_root

    lockfile = worktree_base / ".worktrees" / agent_id / ".agent.lock"
    if not lockfile.exists():
        return False

    try:
        pid = int(lockfile.read_text().strip())
        os.kill(pid, 0)
        return True
    except (ValueError, OSError):
        return False


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

        progress = 0.0
        if last_run_iso:
            try:
                last_dt = datetime.fromisoformat(last_run_iso)
                since = _format_delta(now - last_dt)
                secs = _interval_seconds(interval)
                if secs:
                    next_dt = last_dt + timedelta(seconds=secs)
                    until = _format_delta(next_dt - now)
                    elapsed = (now - last_dt).total_seconds()
                    progress = min(elapsed / secs, 1.0)
                else:
                    until = "—"
            except (ValueError, TypeError):
                since = "error"
                until = "—"
        else:
            since = "no data"
            until = "—"

        running = _is_agent_running(repo_root, agent_id, repo)

        agents.append({
            "id": agent_id,
            "role": role,
            "repo": repo or "(self)",
            "interval": interval,
            "since": since,
            "until": until,
            "running": running,
            "progress": progress,
        })

    return agents


class _AgentCard(Widget):
    """A single agent's status card with progress bar."""

    DEFAULT_CSS = ""

    def __init__(self, agent: dict, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self._agent = agent

    def compose(self) -> ComposeResult:
        a = self._agent
        status = "  [bold green]\\[RUNNING][/bold green]" if a["running"] else ""
        yield Static(
            f"[bold]{a['id']}[/bold]  ({a['role']}){status}\n"
            f"  repo: {a['repo']}  interval: {a['interval']}\n"
            f"  last run: {a['since']} ago  next: {a['until']}",
            classes="agent-info",
        )
        pct = int(a["progress"] * 100)
        yield Static(
            f"  {a['until']}  {pct}%",
            classes="agent-countdown",
        )
        bar = ProgressBar(total=100, show_eta=False, show_percentage=False, classes="agent-progress")
        bar.advance(pct)
        yield bar


class StatusPanel(Widget):
    """Live-updating agent status panel."""

    tick_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static("Agent Status", id="status-header")
        yield VerticalScroll(id="status-agents")

    def on_mount(self) -> None:
        self._repo_root = _find_repo_root()
        self._refresh_display()
        self.set_interval(1, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_display()

    def _refresh_display(self) -> None:
        agents = _load_agents(self._repo_root)
        container = self.query_one("#status-agents", VerticalScroll)
        container.remove_children()

        if not agents:
            container.mount(Static("No agents configured.", classes="agent-info"))
            return

        for a in agents:
            container.mount(_AgentCard(a, classes="agent-card"))
