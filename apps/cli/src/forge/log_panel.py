"""Live agent log panel — real-time tailing of agent log files."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Static, TabbedContent, TabPane

POLL_INTERVAL = 2
MAX_LINES = 500

_RUN_START_RE = re.compile(r"^=== RUN (\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2})Z?) ===$")
_RUN_END_RE = re.compile(r"^=== END RUN ===$")

CARD_WIDTH = 60
CARD_BORDER_COLOR = "#6272a4"
CARD_HEADER_COLOR = "bold cyan"


def _find_repo_root() -> Path:
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


def _load_agent_ids(repo_root: Path) -> list[str]:
    jobs_path = repo_root / "agent-kernel" / "cron" / "cron-jobs.json"
    if not jobs_path.exists():
        return []
    try:
        with open(jobs_path) as f:
            config = json.load(f)
        return [
            job["id"]
            for job in config.get("jobs", [])
            if job.get("enabled", True)
        ]
    except (json.JSONDecodeError, KeyError, OSError):
        return []


def _format_log_content(raw: str) -> str:
    """Format run blocks as card-style Rich markup."""
    lines = raw.splitlines()
    if len(lines) > MAX_LINES:
        lines = lines[-MAX_LINES:]

    formatted: list[str] = []
    i = 0
    bc = CARD_BORDER_COLOR
    hc = CARD_HEADER_COLOR
    while i < len(lines):
        stripped = lines[i].strip()
        m = _RUN_START_RE.match(stripped)
        if m:
            time_str = m.group(2)
            # Collect body lines until END RUN or EOF
            body_lines: list[str] = []
            i += 1
            while i < len(lines):
                end_stripped = lines[i].strip()
                if _RUN_END_RE.match(end_stripped):
                    i += 1
                    break
                body_lines.append(lines[i])
                i += 1
            # Build card
            header = f" {time_str} "
            top = f"[{bc}]╭{'─' * 2}{f'[/{bc}][{hc}]{header}[/{hc}][{bc}]'}{'─' * max(1, CARD_WIDTH - 4 - len(header))}╮[/{bc}]"
            formatted.append(top)
            for body_line in body_lines:
                formatted.append(f"[{bc}]│[/{bc}]  {body_line}")
            bottom = f"[{bc}]╰{'─' * (CARD_WIDTH - 2)}╯[/{bc}]"
            formatted.append(bottom)
        else:
            formatted.append(lines[i])
            i += 1
    return "\n".join(formatted)


class _LogView(Widget):
    """Scrollable log view for a single agent."""

    tick_count = reactive(0)

    def __init__(self, agent_id: str, log_path: Path, **kwargs) -> None:
        super().__init__(**kwargs)
        self._agent_id = agent_id
        self._log_path = log_path
        self._last_size = 0
        self._auto_scroll = True

    def compose(self) -> ComposeResult:
        yield VerticalScroll(
            Static("Waiting for logs...", id=f"log-text-{self._agent_id}"),
            id=f"log-scroll-{self._agent_id}",
        )

    def on_mount(self) -> None:
        self._refresh_log()
        self.set_interval(POLL_INTERVAL, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_log()

    def _refresh_log(self) -> None:
        if not self._log_path.exists():
            return

        try:
            size = self._log_path.stat().st_size
        except OSError:
            return

        if size == self._last_size:
            return
        self._last_size = size

        try:
            raw = self._log_path.read_text(errors="replace")
        except OSError:
            return

        content = _format_log_content(raw)
        text_widget = self.query_one(f"#log-text-{self._agent_id}", Static)
        text_widget.update(content)

        if self._auto_scroll:
            scroll = self.query_one(f"#log-scroll-{self._agent_id}", VerticalScroll)
            scroll.scroll_end(animate=False)

    def on_vertical_scroll_scroll_up(self) -> None:
        self._auto_scroll = False

    def on_vertical_scroll_scroll_down(self) -> None:
        scroll = self.query_one(f"#log-scroll-{self._agent_id}", VerticalScroll)
        if scroll.scroll_offset.y >= scroll.max_scroll_y:
            self._auto_scroll = True


class LogPanel(Widget):
    """Tabbed log panel showing real-time agent output."""

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._repo_root = _find_repo_root()

    def compose(self) -> ComposeResult:
        agent_ids = _load_agent_ids(self._repo_root)
        logs_dir = self._repo_root / "agent-kernel" / "logs"

        if not agent_ids:
            yield Static("No agents configured.", id="log-empty")
            return

        with TabbedContent():
            for agent_id in agent_ids:
                log_path = logs_dir / f"{agent_id}.log"
                with TabPane(agent_id, id=f"tab-{agent_id}"):
                    yield _LogView(agent_id, log_path)
