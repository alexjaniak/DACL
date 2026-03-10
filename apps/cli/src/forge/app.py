from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Static

from forge.log_panel import LogPanel
from forge.status_panel import StatusPanel


class ForgeApp(App):
    """Forge CLI command center."""

    CSS_PATH = "layout.tcss"
    TITLE = "Forge"
    BINDINGS = [
        Binding("l", "toggle_logs", "Toggle Logs"),
    ]

    def compose(self) -> ComposeResult:
        yield Static(" Forge — Agent Orchestration", id="header-bar")
        with Horizontal(id="main"):
            with Vertical(id="left-col"):
                yield LogPanel()
            yield StatusPanel()

    def on_mount(self) -> None:
        self.query_one(LogPanel).display = False

    def action_toggle_logs(self) -> None:
        log_panel = self.query_one(LogPanel)
        log_panel.display = not log_panel.display


def main() -> None:
    app = ForgeApp()
    app.run()
