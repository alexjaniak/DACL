"""Confirmation dialog for removing an agent."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, Static

from forge.status_panel import _find_repo_root


class ConfirmRemoveScreen(ModalScreen[bool]):
    """Modal confirmation dialog for agent removal."""

    DEFAULT_CSS = """
    ConfirmRemoveScreen {
        align: center middle;
    }

    #confirm-dialog {
        width: 50;
        height: auto;
        padding: 1 2;
        background: #1a1a2e;
        border: round #6c3fc5;
    }

    #confirm-title {
        text-style: bold;
        color: #e0e0e0;
        margin-bottom: 1;
    }

    #confirm-message {
        color: #808090;
        margin-bottom: 1;
    }

    #confirm-error {
        color: #ff4444;
        margin-bottom: 1;
        display: none;
    }

    #confirm-buttons {
        align: right middle;
        height: auto;
    }

    #confirm-buttons Button {
        margin-left: 1;
    }
    """

    BINDINGS = [
        ("escape", "cancel", "Cancel"),
    ]

    def __init__(self, agent_id: str) -> None:
        super().__init__()
        self._agent_id = agent_id

    def compose(self) -> ComposeResult:
        with Vertical(id="confirm-dialog"):
            yield Static("Remove Agent", id="confirm-title")
            yield Static(
                f"Remove agent [bold]{self._agent_id}[/bold]? This will delete it from cron-jobs.json and remove its crontab entry.",
                id="confirm-message",
            )
            yield Static("", id="confirm-error")
            with Horizontal(id="confirm-buttons"):
                yield Button("Cancel", id="btn-cancel", variant="default")
                yield Button("Remove", id="btn-confirm", variant="error")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(False)
        elif event.button.id == "btn-confirm":
            self._do_remove()

    def action_cancel(self) -> None:
        self.dismiss(False)

    def _do_remove(self) -> None:
        repo_root = _find_repo_root()
        manage_py = repo_root / "agent-kernel" / "cron" / "manage.py"

        try:
            result = subprocess.run(
                [sys.executable, str(manage_py), "remove", self._agent_id],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                error_widget = self.query_one("#confirm-error", Static)
                error_widget.update(f"Error: {result.stderr.strip()}")
                error_widget.display = True
                return
        except FileNotFoundError:
            error_widget = self.query_one("#confirm-error", Static)
            error_widget.update("Error: manage.py not found")
            error_widget.display = True
            return

        # Also remove from cron-jobs.json
        self._remove_from_jobs_config(repo_root)
        self.dismiss(True)

    def _remove_from_jobs_config(self, repo_root: Path) -> None:
        """Remove the agent entry from cron-jobs.json."""
        import json

        jobs_path = repo_root / "agent-kernel" / "cron" / "cron-jobs.json"
        if not jobs_path.exists():
            return

        with open(jobs_path) as f:
            config = json.load(f)

        config["jobs"] = [j for j in config.get("jobs", []) if j.get("id") != self._agent_id]

        with open(jobs_path, "w") as f:
            json.dump(config, f, indent=2)
            f.write("\n")
