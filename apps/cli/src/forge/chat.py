from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Input, Static
from textual.widget import Widget

from forge.llm import LLMClient


class ChatMessage(Static):
    """A single message in the chat history."""

    def __init__(self, sender: str, text: str) -> None:
        super().__init__(f"[bold]{sender}:[/bold] {text}")


class ChatPane(Widget):
    """Chat interface with scrollable history and text input."""

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self._llm: LLMClient | None = None
        self._llm_error: str | None = None
        try:
            self._llm = LLMClient()
        except RuntimeError as e:
            self._llm_error = str(e)

    def compose(self) -> ComposeResult:
        yield VerticalScroll(id="chat-history")
        yield Input(placeholder="Type a message...", id="chat-input")

    def on_mount(self) -> None:
        if self._llm_error:
            history = self.query_one("#chat-history", VerticalScroll)
            history.mount(ChatMessage("System", self._llm_error))

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
        event.input.clear()
        history = self.query_one("#chat-history", VerticalScroll)
        history.mount(ChatMessage("You", text))
        history.scroll_end(animate=False)

        if self._llm is None:
            history.mount(ChatMessage("System", self._llm_error or "LLM not available."))
            history.scroll_end(animate=False)
            return

        response_widget = ChatMessage("Forge", "")
        history.mount(response_widget)
        history.scroll_end(animate=False)

        collected = []
        async for chunk in self._llm.stream_response(text):
            collected.append(chunk)
            response_widget.update(f"[bold]Forge:[/bold] {''.join(collected)}")
            history.scroll_end(animate=False)

        if not collected:
            response_widget.update("[bold]Forge:[/bold] (no response)")
