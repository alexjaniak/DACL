import json
import subprocess

from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Static

from forge.add_agent_screen import AddAgentScreen
from forge.confirm_remove_screen import ConfirmRemoveScreen
from forge.event_feed import EventFeedPanel
from forge.log_panel import LogPanel
from forge.status_panel import StatusPanel, _AgentCard, _find_repo_root


class ForgeApp(App):
    """Forge CLI command center."""

    CSS_PATH = "layout.tcss"
    TITLE = "Forge"
    BINDINGS = [
        Binding("l", "toggle_logs", "Toggle Logs"),
        Binding("e", "toggle_events", "Toggle Events"),
        Binding("a", "add_agent", "Add Agent"),
        Binding("d", "remove_agent", "Remove Agent"),
        Binding("r", "force_run", "Force Run"),
    ]

    def compose(self) -> ComposeResult:
        yield Static(" Forge — Agent Orchestration", id="header-bar")
        with Horizontal(id="main"):
            with Vertical(id="left-col"):
                yield LogPanel()
            with Vertical(id="right-col"):
                yield StatusPanel()
        yield EventFeedPanel()

    def action_toggle_logs(self) -> None:
        log_panel = self.query_one(LogPanel)
        log_panel.display = not log_panel.display

    def action_toggle_events(self) -> None:
        event_panel = self.query_one(EventFeedPanel)
        event_panel.display = not event_panel.display

    def action_add_agent(self) -> None:
        self.push_screen(AddAgentScreen())

    def action_remove_agent(self) -> None:
        focused = self.focused
        if not isinstance(focused, _AgentCard):
            self.notify("Focus an agent card first (Tab to navigate)", severity="warning")
            return
        self.push_screen(ConfirmRemoveScreen(focused.agent_id))

    def action_force_run(self) -> None:
        focused = self.focused
        if not isinstance(focused, _AgentCard):
            self.notify("Select an agent card first", severity="warning")
            return

        agent_id = focused.agent_id
        agent = focused.agent_data

        if agent.get("running"):
            self.notify(f"Agent {agent_id} is already running", severity="warning")
            return

        repo_root = _find_repo_root()
        jobs_path = repo_root / "agent-kernel" / "cron" / "cron-jobs.json"
        if not jobs_path.exists():
            self.notify("cron-jobs.json not found", severity="error")
            return

        with open(jobs_path) as f:
            config = json.load(f)

        job = next((j for j in config.get("jobs", []) if j["id"] == agent_id), None)
        if not job:
            self.notify(f"No job config for {agent_id}", severity="error")
            return

        run_sh = str(repo_root / "agent-kernel" / "run.sh")
        cmd = [run_sh]
        if job.get("agentic"):
            cmd.append("--agentic")
        if job.get("workspace"):
            cmd += ["--workspace", job["id"]]
        if job.get("repo"):
            cmd += ["--repo", job["repo"]]
        for ctx in job.get("contexts", []):
            cmd += ["--context", ctx]
        cmd.append(job["prompt"])

        log_dir = repo_root / "agent-kernel" / "logs"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"{agent_id}.log"

        with open(log_file, "a") as lf:
            subprocess.Popen(
                cmd,
                stdout=lf,
                stderr=lf,
                cwd=str(repo_root),
                start_new_session=True,
            )

        self.notify(f"Force-run started for {agent_id}")


def main() -> None:
    app = ForgeApp()
    app.run()
