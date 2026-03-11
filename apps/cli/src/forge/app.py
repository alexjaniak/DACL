from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.widgets import Static

from forge.add_agent_screen import AddAgentScreen
from forge.confirm_remove_screen import ConfirmRemoveScreen
from forge.event_feed import EventFeedPanel
from forge.log_panel import LogPanel
from forge.status_panel import StatusPanel, _AgentCard

# Resize step as percentage points
_RESIZE_STEP = 5
# Boundaries for left column width (percentage of #main)
_LEFT_COL_MIN = 20
_LEFT_COL_MAX = 80
# Boundaries for event feed height (rows)
_EVENT_HEIGHT_MIN = 4
_EVENT_HEIGHT_MAX = 30


class ForgeApp(App):
    """Forge CLI command center."""

    CSS_PATH = "layout.tcss"
    TITLE = "Forge"
    BINDINGS = [
        Binding("l", "toggle_logs", "Toggle Logs"),
        Binding("e", "toggle_events", "Toggle Events"),
        Binding("a", "add_agent", "Add Agent"),
        Binding("d", "remove_agent", "Remove Agent"),
        Binding("ctrl+left", "resize_left", "Shrink Left", show=False),
        Binding("ctrl+right", "resize_right", "Grow Left", show=False),
        Binding("ctrl+up", "resize_event_shrink", "Shrink Events", show=False),
        Binding("ctrl+down", "resize_event_grow", "Grow Events", show=False),
    ]

    def __init__(self) -> None:
        super().__init__()
        self._left_pct = 75  # left column width as percentage
        self._event_height = 12  # event feed height in rows

    def compose(self) -> ComposeResult:
        yield Static(" Forge — Agent Orchestration", id="header-bar")
        with Horizontal(id="main"):
            with Vertical(id="left-col"):
                yield LogPanel()
            with Vertical(id="right-col"):
                yield StatusPanel()
        yield EventFeedPanel()

    def on_mount(self) -> None:
        self._apply_column_sizes()
        self._apply_event_height()

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

    def action_resize_left(self) -> None:
        self._left_pct = max(_LEFT_COL_MIN, self._left_pct - _RESIZE_STEP)
        self._apply_column_sizes()

    def action_resize_right(self) -> None:
        self._left_pct = min(_LEFT_COL_MAX, self._left_pct + _RESIZE_STEP)
        self._apply_column_sizes()

    def action_resize_event_shrink(self) -> None:
        self._event_height = max(_EVENT_HEIGHT_MIN, self._event_height - 2)
        self._apply_event_height()

    def action_resize_event_grow(self) -> None:
        self._event_height = min(_EVENT_HEIGHT_MAX, self._event_height + 2)
        self._apply_event_height()

    def _apply_column_sizes(self) -> None:
        left = self.query_one("#left-col")
        right = self.query_one("#right-col")
        left.styles.width = f"{self._left_pct}%"
        right.styles.width = f"{100 - self._left_pct}%"

    def _apply_event_height(self) -> None:
        event_panel = self.query_one(EventFeedPanel)
        event_panel.styles.height = self._event_height


def main() -> None:
    app = ForgeApp()
    app.run()
