"""Agent status panel — live display of cron agent timing."""

from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

from textual.app import ComposeResult
from textual.css.query import NoMatches
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

        if running:
            agent_state = "running"
        elif until == "overdue":
            agent_state = "overdue"
        else:
            agent_state = "idle"

        agents.append({
            "id": agent_id,
            "role": role,
            "repo": repo or "(self)",
            "interval": interval,
            "since": since,
            "until": until,
            "running": running,
            "progress": progress,
            "state": agent_state,
        })

    return agents


def _structural_key(agent: dict) -> tuple:
    """Return the fields that define card identity (not timer values)."""
    return (agent["id"], agent["role"], agent["repo"], agent["interval"])


def _info_text(a: dict) -> str:
    state_markup = {
        "running": "[bold green]● RUNNING[/bold green]",
        "overdue": "[bold red]● OVERDUE[/bold red]",
        "idle": "[dim]○ idle[/dim]",
    }
    indicator = state_markup.get(a["state"], "[dim]○ idle[/dim]")
    return (
        f"{indicator}  [bold]{a['id']}[/bold]  ({a['role']})\n"
        f"  repo: {a['repo']}  interval: {a['interval']}\n"
        f"  last run: {a['since']} ago  next: {a['until']}"
    )


class _AgentCard(Widget):
    """A single agent's status card with progress bar."""

    DEFAULT_CSS = ""
    can_focus = True

    def __init__(self, agent: dict, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self._agent = agent

    @property
    def agent_id(self) -> str:
        return self._agent["id"]

    @property
    def agent_data(self) -> dict:
        return self._agent

    def compose(self) -> ComposeResult:
        a = self._agent
        yield Static(_info_text(a), classes="agent-info")
        pct = int(a["progress"] * 100)
        yield Static(
            f"  {a['until']}  {pct}%",
            classes="agent-countdown",
        )
        bar = ProgressBar(total=100, show_eta=False, show_percentage=False, classes="agent-progress")
        bar.advance(pct)
        yield bar

    def update_data(self, agent: dict) -> None:
        """Update card contents in-place without remounting."""
        self._agent = agent
        try:
            info = self.query_one(".agent-info", Static)
        except NoMatches:
            return
        info.update(_info_text(agent))
        pct = int(agent["progress"] * 100)
        self.query_one(".agent-countdown", Static).update(
            f"  {agent['until']}  {pct}%"
        )
        bar = self.query_one(ProgressBar)
        bar.update(total=100, progress=pct)


class StatusPanel(Widget):
    """Live-updating agent status panel."""

    tick_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static("Agent Status", id="status-header")
        yield VerticalScroll(id="status-agents")

    def on_mount(self) -> None:
        self._repo_root = _find_repo_root()
        self._last_structural_keys: list[tuple] = []
        self._refresh_display()
        self.set_interval(1, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_display()

    def _refresh_display(self) -> None:
        agents = _load_agents(self._repo_root)
        container = self.query_one("#status-agents", VerticalScroll)

        current_keys = [_structural_key(a) for a in agents]

        if current_keys == self._last_structural_keys and agents:
            cards = container.query(_AgentCard)
            for card, agent in zip(cards, agents):
                card.update_data(agent)
            return

        self._last_structural_keys = current_keys
        container.remove_children()

        if not agents:
            container.mount(Static("No agents configured.", classes="agent-info"))
            return

        for a in agents:
            container.mount(_AgentCard(a, classes="agent-card"))
