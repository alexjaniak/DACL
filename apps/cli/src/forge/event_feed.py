"""Event feed panel — live display of GitHub events from webhook monitor."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from textual.app import ComposeResult
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Static
from textual.containers import VerticalScroll

MAX_DISPLAY_EVENTS = 50
POLL_INTERVAL = 3

EVENT_COLORS = {
    "opened": "green",
    "created": "green",
    "reopened": "green",
    "labeled": "yellow",
    "unlabeled": "yellow",
    "edited": "yellow",
    "synchronize": "yellow",
    "closed": "red",
    "deleted": "red",
    "dismissed": "red",
    "submitted": "#5599ff",
    "commented": "#5599ff",
}

TYPE_DISPLAY = {
    "issue": "issue",
    "pr": "pr",
    "comment": "comment",
    "review": "review",
}


def _events_file_path() -> str:
    return os.environ.get("FORGE_EVENTS_FILE", "./events.jsonl")


def _load_events(path: str, limit: int = MAX_DISPLAY_EVENTS) -> list[dict]:
    """Load the last `limit` events from JSONL file, newest first."""
    p = Path(path)
    if not p.exists():
        return []

    lines: list[str] = []
    try:
        with open(p) as f:
            lines = f.readlines()
    except OSError:
        return []

    events = []
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
        if len(events) >= limit:
            break

    return events


def _format_time(timestamp: str) -> str:
    """Extract HH:MM:SS from ISO timestamp."""
    try:
        dt = datetime.fromisoformat(timestamp)
        return dt.strftime("%H:%M:%S")
    except (ValueError, TypeError):
        return "??:??:??"


def _color_for_action(action: str) -> str:
    return EVENT_COLORS.get(action, "#808090")


def _format_event_line(event: dict) -> str:
    """Format a single event as a colored one-liner."""
    ts = _format_time(event.get("timestamp", ""))
    event_type = event.get("event_type", "unknown")
    number = event.get("number")
    actor = event.get("actor", "")
    summary = event.get("summary", "")
    action = event.get("raw_action", "")

    color = _color_for_action(action)

    # Pad event_type to align columns
    type_display = f"{event_type:<16}"
    number_display = f"#{number}" if number else "    "
    number_display = f"{number_display:<6}"

    # Truncate summary to keep compact
    # Remove the prefix that repeats event type info
    short_summary = _shorten_summary(summary, event_type, number)

    return (
        f"[dim]{ts}[/dim]  "
        f"[{color}]{type_display}[/{color}]  "
        f"[bold]{number_display}[/bold]  "
        f"[dim]{actor:<14}[/dim]  "
        f"{short_summary}"
    )


def _shorten_summary(summary: str, event_type: str, number: int | None) -> str:
    """Remove redundant prefix from summary (e.g. 'Issue #42 opened: ')."""
    if number and summary:
        prefix_patterns = [
            f"Issue #{number} ",
            f"PR #{number} ",
            f"#{number} ",
        ]
        for prefix in prefix_patterns:
            if summary.startswith(prefix):
                rest = summary[len(prefix):]
                # Skip past "action: " if present
                if ": " in rest:
                    _, _, after = rest.partition(": ")
                    return after if after else rest
                return rest
        # For comments: "user commented on Issue #42" -> strip actor prefix
        if " commented on " in summary:
            _, _, rest = summary.partition(" commented on ")
            return rest

    # Cap length
    if len(summary) > 50:
        return summary[:47] + "..."
    return summary


class EventFeed(Widget):
    """Live-updating GitHub event feed from webhook monitor."""

    tick_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static("Event Feed", id="event-feed-header")
        yield VerticalScroll(
            Static("No events yet", id="event-feed-content"),
            id="event-feed-scroll",
        )

    def on_mount(self) -> None:
        self._events_path = _events_file_path()
        self._last_line_count = 0
        self._refresh_display()
        self.set_interval(POLL_INTERVAL, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_display()

    def _refresh_display(self) -> None:
        events = _load_events(self._events_path)
        content = self.query_one("#event-feed-content", Static)

        if not events:
            content.update("[dim]No events yet[/dim]")
            return

        lines = [_format_event_line(e) for e in events]
        content.update("\n".join(lines))
