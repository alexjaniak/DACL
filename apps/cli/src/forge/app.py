from textual.app import App, ComposeResult
from textual.containers import Horizontal
from textual.widgets import Static

from forge.chat import ChatPane
from forge.status_panel import StatusPanel


class ForgeApp(App):
    """Forge CLI command center."""

    CSS_PATH = "layout.tcss"
    TITLE = "Forge"

    def compose(self) -> ComposeResult:
        yield Static(" Forge — Agent Orchestration", id="header-bar")
        with Horizontal(id="main"):
            yield ChatPane()
            yield StatusPanel()


def main() -> None:
    app = ForgeApp()
    app.run()
