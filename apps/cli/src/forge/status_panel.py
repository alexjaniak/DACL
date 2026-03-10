from textual.app import ComposeResult
from textual.widgets import Static
from textual.widget import Widget


class StatusPanel(Widget):
    """Placeholder panel for agent status display."""

    def compose(self) -> ComposeResult:
        yield Static("[bold]Agent Status[/bold]", id="status-header")
        yield Static("No agents running.", id="status-content")
