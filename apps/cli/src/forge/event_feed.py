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

MAX_DISPLAY_EVENTS = 50
POLL_INTERVAL = 3

EVENT_TYPE_COLORS = {
    "opened": "green",
    "created": "green",
    "reopened": "green",
    "closed": "red",
    "deleted": "red",
    "merged": "magenta",
    "labeled": "yellow",
    "unlabeled": "yellow",
    "assigned": "yellow",
    "unassigned": "yellow",
    "submitted": "blue",
    "commented": "blue",
}


def _get_events_path() -> Path:
    return Path(os.environ.get("FORGE_EVENTS_FILE", "./events.jsonl"))


def _color_for_action(raw_action: str) -> str:
    return EVENT_TYPE_COLORS.get(raw_action, "white")


def _format_event_line(event: dict) -> str:
    ts = event.get("timestamp", "")
    try:
        dt = datetime.fromisoformat(ts)
        time_str = dt.strftime("%H:%M:%S")
    except (ValueError, TypeError):
        time_str = "??:??:??"

    event_type = event.get("event_type", "unknown")
    number = event.get("number")
    actor = event.get("actor", "?")
    summary = event.get("summary", "")
    raw_action = event.get("raw_action", "")
    color = _color_for_action(raw_action)

    num_str = f"#{number}" if number else "—"

    # Truncate summary to keep lines compact
    if len(summary) > 50:
        summary = summary[:47] + "..."

    return (
        f"{time_str}  "
        f"[{color}]{event_type:<16}[/{color}]  "
        f"{num_str:<6}  "
        f"{actor:<14}  "
        f"{summary}"
    )


def _load_events(path: Path) -> list[dict]:
    if not path.exists():
        return []
    events = []
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        events.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    except OSError:
        return []
    return events


class EventFeedPanel(Widget):
    """Live-updating event feed showing GitHub events from webhook monitor."""

    tick_count = reactive(0)

    def compose(self) -> ComposeResult:
        yield Static("Event Feed", id="event-header")
        yield Static("No events yet", id="event-content")

    def on_mount(self) -> None:
        self._events_path = _get_events_path()
        self._last_count = 0
        self._refresh_display()
        self.set_interval(POLL_INTERVAL, self._tick)

    def _tick(self) -> None:
        self.tick_count += 1

    def watch_tick_count(self) -> None:
        self._refresh_display()

    def _refresh_display(self) -> None:
        events = _load_events(self._events_path)

        if not events:
            self.query_one("#event-content", Static).update("No events yet")
            self._last_count = 0
            return

        # Reverse chronological, last N
        recent = events[-MAX_DISPLAY_EVENTS:]
        recent.reverse()

        lines = [_format_event_line(e) for e in recent]
        self.query_one("#event-content", Static).update("\n".join(lines))
        self._last_count = len(events)
