"""Modal dialog for adding a new agent."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.screen import ModalScreen
from textual.widgets import Button, Checkbox, Input, Static, TextArea

from forge.status_panel import _find_repo_root


class AddAgentScreen(ModalScreen[bool]):
    """Modal form dialog for adding a new agent via manage.py add."""

    DEFAULT_CSS = """
    AddAgentScreen {
        align: center middle;
    }

    #add-dialog {
        width: 70;
        height: auto;
        max-height: 80%;
        padding: 1 2;
        background: #1a1a2e;
        border: round #6c3fc5;
    }

    #add-title {
        text-style: bold;
        color: #e0e0e0;
        margin-bottom: 1;
    }

    .add-label {
        height: auto;
        color: #b090e0;
        margin-top: 1;
    }

    #add-prompt-area {
        height: 4;
        margin-top: 0;
    }

    #add-error {
        color: #ff4444;
        margin-top: 1;
        display: none;
    }

    #add-buttons {
        align: right middle;
        height: auto;
        margin-top: 1;
    }

    #add-buttons Button {
        margin-left: 1;
    }
    """

    BINDINGS = [
        ("escape", "cancel", "Cancel"),
    ]

    def compose(self) -> ComposeResult:
        with Vertical(id="add-dialog"):
            yield Static("Add Agent", id="add-title")

            yield Static("Agent ID (required)", classes="add-label")
            yield Input(placeholder="e.g. worker-01", id="add-id")

            yield Static("Interval (required)", classes="add-label")
            yield Input(placeholder="e.g. 10m, 1h", id="add-interval")

            yield Static("Prompt (required)", classes="add-label")
            yield TextArea(id="add-prompt-area")

            yield Checkbox("Agentic mode", value=True, id="add-agentic")
            yield Checkbox("Workspace (isolated worktree)", value=False, id="add-workspace")

            yield Static("Contexts (comma-separated, optional)", classes="add-label")
            yield Input(placeholder="e.g. contexts/WORKER.md, contexts/REPO.md", id="add-contexts")

            yield Static("Repo (optional)", classes="add-label")
            yield Input(placeholder="e.g. github.com/owner/repo", id="add-repo")

            yield Static("", id="add-error")
            with Horizontal(id="add-buttons"):
                yield Button("Cancel", id="btn-cancel", variant="default")
                yield Button("Add", id="btn-add", variant="success")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "btn-cancel":
            self.dismiss(False)
        elif event.button.id == "btn-add":
            self._do_add()

    def action_cancel(self) -> None:
        self.dismiss(False)

    def _show_error(self, message: str) -> None:
        error_widget = self.query_one("#add-error", Static)
        error_widget.update(message)
        error_widget.display = True

    def _do_add(self) -> None:
        agent_id = self.query_one("#add-id", Input).value.strip()
        interval = self.query_one("#add-interval", Input).value.strip()
        prompt = self.query_one("#add-prompt-area", TextArea).text.strip()
        agentic = self.query_one("#add-agentic", Checkbox).value
        workspace = self.query_one("#add-workspace", Checkbox).value
        contexts_raw = self.query_one("#add-contexts", Input).value.strip()
        repo = self.query_one("#add-repo", Input).value.strip()

        if not agent_id:
            self._show_error("Agent ID is required.")
            return
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", agent_id):
            self._show_error("Agent ID must contain only alphanumeric, dashes, underscores.")
            return
        if not interval:
            self._show_error("Interval is required.")
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
        if repo:
            cmd.extend(["--repo", repo])

        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                self._show_error(f"Error: {result.stderr.strip()}")
                return
        except FileNotFoundError:
            self._show_error("Error: manage.py not found")
            return

        self._add_to_jobs_config(repo_root, agent_id, interval, prompt, agentic, workspace, contexts_raw, repo)
        self.dismiss(True)

    def _add_to_jobs_config(
        self,
        repo_root: Path,
        agent_id: str,
        interval: str,
        prompt: str,
        agentic: bool,
        workspace: bool,
        contexts_raw: str,
        repo: str,
    ) -> None:
        """Add the agent entry to cron-jobs.json so the dashboard picks it up."""
        import json

        jobs_path = repo_root / "agent-kernel" / "cron" / "cron-jobs.json"
        if not jobs_path.exists():
            return

        with open(jobs_path) as f:
            config = json.load(f)

        contexts = [c.strip() for c in contexts_raw.split(",") if c.strip()] if contexts_raw else []

        entry = {
            "id": agent_id,
            "interval": interval,
            "prompt": prompt,
            "agentic": agentic,
            "workspace": workspace,
            "contexts": contexts,
        }
        if repo:
            entry["repo"] = repo

        config.setdefault("jobs", []).append(entry)

        with open(jobs_path, "w") as f:
            json.dump(config, f, indent=2)
            f.write("\n")
