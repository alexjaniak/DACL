"""Event feed panel — live display of GitHub events from webhook monitor."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import VerticalScroll
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


def _format_event(event: dict) -> str:
    """Format an event as a multi-line block with detailed info."""
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
    labels = event.get("labels", [])
    color = _color_for_action(raw_action)

    num_str = f"#{number}" if number else "—"

    # Line 1: timestamp, colored event type, issue/PR number
    line1 = (
        f"[dim]{time_str}[/dim]  "
        f"[{color} bold]{event_type}[/{color} bold]  "
        f"[cyan]{num_str}[/cyan]"
    )

    # Line 2: actor and summary
    if len(summary) > 100:
        summary = summary[:97] + "..."
    line2 = f"  [dim]@{actor}[/dim]  {summary}"

    lines = [line1, line2]

    # Line 3 (optional): labels
    if labels:
        label_str = ", ".join(labels[:5])
        if len(labels) > 5:
            label_str += f" +{len(labels) - 5}"
        lines.append(f"  [yellow dim]labels: {label_str}[/yellow dim]")

    return "\n".join(lines)


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
        with VerticalScroll(id="event-scroll"):
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

        content = self.query_one("#event-content", Static)

        if not events:
            content.update("No events yet")
            self._last_count = 0
            return

        # Reverse chronological, last N
        recent = events[-MAX_DISPLAY_EVENTS:]
        recent.reverse()

        # Join events with blank-line separator for readability
        blocks = [_format_event(e) for e in recent]
        content.update("\n\n".join(blocks))
        self._last_count = len(events)
