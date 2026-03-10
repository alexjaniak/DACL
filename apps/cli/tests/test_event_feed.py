"""Tests for event feed logic (pure functions, no TUI)."""

import json
from pathlib import Path

from forge.event_feed import (
    _format_event_line,
    _format_time,
    _load_events,
    _shorten_summary,
)


def _make_event(
    event_type: str = "issue.opened",
    number: int = 42,
    actor: str = "worker-01",
    summary: str = "Issue #42 opened: Fix auth",
    raw_action: str = "opened",
    timestamp: str = "2026-03-10T12:34:05+00:00",
) -> dict:
    return {
        "timestamp": timestamp,
        "event_type": event_type,
        "repo": "alexjaniak/DACL",
        "number": number,
        "actor": actor,
        "summary": summary,
        "raw_action": raw_action,
        "labels": [],
    }


class TestLoadEvents:
    def test_missing_file_returns_empty(self, tmp_path: Path) -> None:
        result = _load_events(str(tmp_path / "missing.jsonl"))
        assert result == []

    def test_loads_events_newest_first(self, tmp_path: Path) -> None:
        f = tmp_path / "events.jsonl"
        events = [
            _make_event(timestamp="2026-03-10T12:00:00+00:00", number=1),
            _make_event(timestamp="2026-03-10T12:01:00+00:00", number=2),
            _make_event(timestamp="2026-03-10T12:02:00+00:00", number=3),
        ]
        f.write_text("\n".join(json.dumps(e) for e in events) + "\n")

        result = _load_events(str(f))
        assert len(result) == 3
        assert result[0]["number"] == 3  # newest first
        assert result[2]["number"] == 1

    def test_respects_limit(self, tmp_path: Path) -> None:
        f = tmp_path / "events.jsonl"
        events = [_make_event(number=i) for i in range(10)]
        f.write_text("\n".join(json.dumps(e) for e in events) + "\n")

        result = _load_events(str(f), limit=3)
        assert len(result) == 3

    def test_skips_invalid_json(self, tmp_path: Path) -> None:
        f = tmp_path / "events.jsonl"
        f.write_text(
            json.dumps(_make_event(number=1)) + "\n"
            + "not valid json\n"
            + json.dumps(_make_event(number=2)) + "\n"
        )

        result = _load_events(str(f))
        assert len(result) == 2

    def test_empty_file(self, tmp_path: Path) -> None:
        f = tmp_path / "events.jsonl"
        f.write_text("")
        assert _load_events(str(f)) == []


class TestFormatTime:
    def test_iso_timestamp(self) -> None:
        assert _format_time("2026-03-10T12:34:05+00:00") == "12:34:05"

    def test_invalid_timestamp(self) -> None:
        assert _format_time("garbage") == "??:??:??"

    def test_none(self) -> None:
        assert _format_time(None) == "??:??:??"


class TestShortenSummary:
    def test_strips_issue_prefix(self) -> None:
        result = _shorten_summary("Issue #42 opened: Fix auth", "issue.opened", 42)
        assert result == "Fix auth"

    def test_strips_pr_prefix(self) -> None:
        result = _shorten_summary("PR #10 merged: CLI scaffold", "pr.closed", 10)
        assert result == "CLI scaffold"

    def test_strips_comment_prefix(self) -> None:
        result = _shorten_summary(
            "worker-01 commented on Issue #42", "comment.created", 42
        )
        assert result == "Issue #42"

    def test_truncates_long_summary(self) -> None:
        long_text = "A" * 60
        result = _shorten_summary(long_text, "unknown", None)
        assert len(result) == 50
        assert result.endswith("...")

    def test_short_summary_unchanged(self) -> None:
        assert _shorten_summary("hello", "unknown", None) == "hello"


class TestFormatEventLine:
    def test_contains_key_parts(self) -> None:
        event = _make_event()
        line = _format_event_line(event)
        assert "12:34:05" in line
        assert "issue.opened" in line
        assert "#42" in line
        assert "worker-01" in line

    def test_no_number_event(self) -> None:
        event = _make_event(number=None, summary="some event")
        line = _format_event_line(event)
        assert "some event" in line
