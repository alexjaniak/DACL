"""Add Agent modal dialog — form to create a new cron agent."""

from __future__ import annotations

import json
import re
import subprocess
import sys

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, Checkbox, Input, Static, TextArea

from forge.status_panel import _find_repo_root


class AddAgentScreen(ModalScreen[bool]):
    """Modal form to add a new cron agent."""

    BINDINGS = [
        Binding("escape", "cancel", "Cancel"),
    ]

    DEFAULT_CSS = """
    AddAgentScreen {
        align: center middle;
    }

    #add-agent-dialog {
        width: 70;
        max-height: 80%;
        background: #16162a;
        border: round #3a3a5c;
        padding: 1 2;
    }

    #add-agent-title {
        text-style: bold;
        color: #6c3fc5;
        margin-bottom: 1;
        text-align: center;
    }

    #add-agent-error {
        color: #ff4444;
        height: auto;
        margin-bottom: 1;
    }

    .form-label {
        height: auto;
        margin-top: 1;
        color: #b0b0c0;
    }

    #prompt-input {
        height: 6;
    }

    .form-buttons {
        margin-top: 1;
        height: auto;
        align: center middle;
    }

    .form-buttons Button {
        margin: 0 1;
    }
    """

    def compose(self) -> ComposeResult:
        with Vertical(id="add-agent-dialog"):
            yield Static("Add Agent", id="add-agent-title")
            yield Static("", id="add-agent-error")

            yield Static("Agent ID (required)", classes="form-label")
            yield Input(placeholder="e.g. worker-03", id="id-input")

            yield Static("Interval (required, e.g. 5m, 1h)", classes="form-label")
            yield Input(placeholder="e.g. 5m", id="interval-input")

            yield Static("Prompt (required)", classes="form-label")
            yield TextArea(id="prompt-input")

            yield Static("Contexts (comma-separated paths, optional)", classes="form-label")
            yield Input(placeholder="e.g. contexts/WORKER.md, contexts/CONSTRAINTS.md", id="contexts-input")

            yield Checkbox("Agentic mode", value=True, id="agentic-check")
            yield Checkbox("Workspace mode", value=True, id="workspace-check")

            with Vertical(classes="form-buttons"):
                yield Button("Submit", variant="primary", id="submit-btn")
                yield Button("Cancel", variant="default", id="cancel-btn")

    def _show_error(self, message: str) -> None:
        self.query_one("#add-agent-error", Static).update(message)

    def _clear_error(self) -> None:
        self.query_one("#add-agent-error", Static).update("")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "cancel-btn":
            self.dismiss(False)
            return
        if event.button.id == "submit-btn":
            self._submit()

    def action_cancel(self) -> None:
        self.dismiss(False)

    def _submit(self) -> None:
        self._clear_error()

        agent_id = self.query_one("#id-input", Input).value.strip()
        interval = self.query_one("#interval-input", Input).value.strip()
        prompt = self.query_one("#prompt-input", TextArea).text.strip()
        contexts_raw = self.query_one("#contexts-input", Input).value.strip()
        agentic = self.query_one("#agentic-check", Checkbox).value
        workspace = self.query_one("#workspace-check", Checkbox).value

        if not agent_id:
            self._show_error("Agent ID is required.")
            return
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", agent_id):
            self._show_error("Invalid ID: use only letters, numbers, dashes, underscores.")
            return
        if not interval:
            self._show_error("Interval is required.")
            return
        if not re.fullmatch(r"\d+[mh]", interval):
            self._show_error("Invalid interval: use format like 5m or 1h.")
            return
        if not prompt:
            self._show_error("Prompt is required.")
            return

        repo_root = _find_repo_root()
        manage_py = repo_root / "agent-kernel" / "cron" / "manage.py"

        cmd = [sys.executable, str(manage_py), "add", agent_id, interval, prompt]
        if agentic:
            cmd.append("--agentic")
        if workspace:
            cmd.append("--workspace")
        if contexts_raw:
            for ctx in contexts_raw.split(","):
                ctx = ctx.strip()
                if ctx:
                    cmd.extend(["--context", ctx])

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(repo_root),
            )
            if result.returncode != 0:
                err = result.stderr.strip() or result.stdout.strip() or "Unknown error"
                self._show_error(f"Failed: {err}")
                return
        except FileNotFoundError:
            self._show_error("Could not find Python executable or manage.py.")
            return

        # Also add to cron-jobs.json so StatusPanel picks it up
        jobs_path = repo_root / "agent-kernel" / "cron" / "cron-jobs.json"
        if jobs_path.exists():
            try:
                with open(jobs_path) as f:
                    config = json.load(f)
                new_job: dict = {
                    "id": agent_id,
                    "interval": interval,
                    "prompt": prompt,
                    "agentic": agentic,
                    "workspace": workspace,
                }
                if contexts_raw:
                    contexts = [c.strip() for c in contexts_raw.split(",") if c.strip()]
                    if contexts:
                        new_job["contexts"] = contexts
                config.setdefault("jobs", []).append(new_job)
                with open(jobs_path, "w") as f:
                    json.dump(config, f, indent=2)
                    f.write("\n")
            except (json.JSONDecodeError, OSError):
                pass  # manage.py already added it to crontab; jobs file is secondary

        self.dismiss(True)
