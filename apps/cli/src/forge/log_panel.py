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
RUN_SEPARATOR = "─" * 40

# Color palette matching agent-kernel/logs/view.sh
_AGENT_COLORS = [
    "blue",
    "green",
    "yellow",
    "magenta",
    "cyan",
    "red1",
    "green1",
    "yellow1",
    "blue1",
    "magenta1",
]

_RUN_RE = re.compile(r"^=== RUN (.+) ===$")


def _color_for_agent(agent_id: str) -> str:
    h = 0
    for ch in agent_id:
        h = (h + ord(ch)) % len(_AGENT_COLORS)
    return _AGENT_COLORS[h]


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
    """Apply visual separators for run markers."""
    lines = raw.splitlines()
    if len(lines) > MAX_LINES:
        lines = lines[-MAX_LINES:]
    formatted = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("=== RUN ") or stripped.startswith("=== END RUN"):
            formatted.append(f"[bold cyan]{RUN_SEPARATOR}[/bold cyan]")
            formatted.append(f"[bold cyan]{stripped}[/bold cyan]")
            formatted.append(f"[bold cyan]{RUN_SEPARATOR}[/bold cyan]")
        else:
            formatted.append(line)
    return "\n".join(formatted)


class _AllLogsView(Widget):
    """Scrollable view interleaving logs from all agents, color-coded."""

    tick_count = reactive(0)

    def __init__(self, agent_ids: list[str], logs_dir: Path, **kwargs) -> None:
        super().__init__(**kwargs)
        self._agent_ids = agent_ids
        self._logs_dir = logs_dir
        self._last_sizes: dict[str, int] = {aid: 0 for aid in agent_ids}
        self._auto_scroll = True

    def compose(self) -> ComposeResult:
        yield VerticalScroll(
            Static("Waiting for logs...", id="log-text-all"),
            id="log-scroll-all",
        )

    def on_mount(self) -> None:
        self._refresh_log()
        self.set_interval(POLL_INTERVAL, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_log()

    def _refresh_log(self) -> None:
        any_changed = False
        for aid in self._agent_ids:
            path = self._logs_dir / f"{aid}.log"
            if not path.exists():
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue
            if size != self._last_sizes.get(aid, 0):
                any_changed = True
                self._last_sizes[aid] = size

        if not any_changed:
            return

        # Collect timestamped run blocks and loose lines per agent
        entries: list[tuple[str, str, list[str]]] = []  # (sort_key, agent_id, lines)
        for aid in self._agent_ids:
            path = self._logs_dir / f"{aid}.log"
            if not path.exists():
                continue
            try:
                raw = path.read_text(errors="replace")
            except OSError:
                continue
            self._parse_entries(aid, raw, entries)

        entries.sort(key=lambda e: e[0])

        formatted: list[str] = []
        for _, aid, lines in entries:
            color = _color_for_agent(aid)
            tag = f"[bold {color}]\\[{aid}][/bold {color}]"
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("=== RUN ") or stripped.startswith("=== END RUN"):
                    formatted.append(
                        f"{tag} [bold cyan]{RUN_SEPARATOR}[/bold cyan]"
                    )
                    formatted.append(f"{tag} [bold cyan]{stripped}[/bold cyan]")
                    formatted.append(
                        f"{tag} [bold cyan]{RUN_SEPARATOR}[/bold cyan]"
                    )
                else:
                    formatted.append(f"{tag} {line}")

        if len(formatted) > MAX_LINES:
            formatted = formatted[-MAX_LINES:]

        text_widget = self.query_one("#log-text-all", Static)
        text_widget.update("\n".join(formatted))

        if self._auto_scroll:
            scroll = self.query_one("#log-scroll-all", VerticalScroll)
            scroll.scroll_end(animate=False)

    @staticmethod
    def _parse_entries(
        agent_id: str,
        raw: str,
        out: list[tuple[str, str, list[str]]],
    ) -> None:
        lines = raw.splitlines()
        block: list[str] = []
        block_key = ""
        loose: list[str] = []

        for line in lines:
            m = _RUN_RE.match(line.strip())
            if m:
                if loose:
                    out.append(("", agent_id, loose))
                    loose = []
                if block:
                    out.append((block_key, agent_id, block))
                block = [line]
                block_key = m.group(1)
                continue
            if line.strip() == "=== END RUN ===":
                block.append(line)
                out.append((block_key, agent_id, block))
                block = []
                block_key = ""
                continue
            if block:
                block.append(line)
            else:
                loose.append(line)

        if block:
            out.append((block_key, agent_id, block))
        if loose:
            out.append(("", agent_id, loose))

    def on_vertical_scroll_scroll_up(self) -> None:
        self._auto_scroll = False

    def on_vertical_scroll_scroll_down(self) -> None:
        scroll = self.query_one("#log-scroll-all", VerticalScroll)
        if scroll.scroll_offset.y >= scroll.max_scroll_y:
            self._auto_scroll = True


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
            with TabPane("All", id="tab-all"):
                yield _AllLogsView(agent_ids, logs_dir)
            for agent_id in agent_ids:
                log_path = logs_dir / f"{agent_id}.log"
                with TabPane(agent_id, id=f"tab-{agent_id}"):
                    yield _LogView(agent_id, log_path)
