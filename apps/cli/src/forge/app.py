from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Static

from forge.add_agent_screen import AddAgentScreen
from forge.confirm_remove_screen import ConfirmRemoveScreen
from forge.event_feed import EventFeedPanel
from forge.log_panel import LogPanel
from forge.status_panel import StatusPanel, _AgentCard


class ForgeApp(App):
    """Forge CLI command center."""

    CSS_PATH = "layout.tcss"
    TITLE = "Forge"
    BINDINGS = [
        Binding("l", "toggle_logs", "Toggle Logs"),
        Binding("e", "toggle_events", "Toggle Events"),
        Binding("s", "toggle_status", "Toggle Status"),
        Binding("a", "add_agent", "Add Agent"),
        Binding("d", "remove_agent", "Remove Agent"),
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

    def action_toggle_status(self) -> None:
        status_panel = self.query_one(StatusPanel)
        status_panel.display = not status_panel.display

    def action_add_agent(self) -> None:
        self.push_screen(AddAgentScreen())

    def action_remove_agent(self) -> None:
        focused = self.focused
        if not isinstance(focused, _AgentCard):
            self.notify("Focus an agent card first (Tab to navigate)", severity="warning")
            return
        self.push_screen(ConfirmRemoveScreen(focused.agent_id))


def main() -> None:
    app = ForgeApp()
    app.run()
