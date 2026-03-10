from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Input, Static
from textual.widget import Widget


class ChatMessage(Static):
    """A single message in the chat history."""

    def __init__(self, sender: str, text: str) -> None:
        super().__init__(f"[bold]{sender}:[/bold] {text}")


class ChatPane(Widget):
    """Chat interface with scrollable history and text input."""

    def compose(self) -> ComposeResult:
        yield VerticalScroll(id="chat-history")
        yield Input(placeholder="Type a message...", id="chat-input")

    def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
        event.input.clear()
        history = self.query_one("#chat-history", VerticalScroll)
        history.mount(ChatMessage("You", text))
        history.mount(ChatMessage("Forge", text))
        history.scroll_end(animate=False)
