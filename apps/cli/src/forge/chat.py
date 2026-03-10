from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Input, Markdown, Static
from textual.widget import Widget

from forge.llm import LLMClient


class UserMessage(Static):
    """A user message in the chat history."""

    DEFAULT_CSS = ""

    def __init__(self, text: str) -> None:
        super().__init__(f"> {text}", classes="user-message")


class AssistantMessage(Markdown):
    """An assistant message rendered as markdown."""

    DEFAULT_CSS = ""

    def __init__(self, text: str = "") -> None:
        super().__init__(text, classes="assistant-message")


class SystemMessage(Static):
    """A system/error message."""

    DEFAULT_CSS = ""

    def __init__(self, text: str) -> None:
        super().__init__(text, classes="system-message")


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
        yield Input(placeholder="> Type a message...", id="chat-input")

    def on_mount(self) -> None:
        if self._llm_error:
            history = self.query_one("#chat-history", VerticalScroll)
            history.mount(SystemMessage(self._llm_error))

    async def on_input_submitted(self, event: Input.Submitted) -> None:
        text = event.value.strip()
        if not text:
            return
        event.input.clear()
        history = self.query_one("#chat-history", VerticalScroll)
        history.mount(UserMessage(text))
        history.scroll_end(animate=False)

        if self._llm is None:
            history.mount(SystemMessage(self._llm_error or "LLM not available."))
            history.scroll_end(animate=False)
            return

        response_widget = AssistantMessage()
        history.mount(response_widget)
        history.scroll_end(animate=False)

        collected: list[str] = []
        async for chunk in self._llm.stream_response(text):
            collected.append(chunk)
            response_widget.update("".join(collected))
            history.scroll_end(animate=False)

        if not collected:
            response_widget.update("*(no response)*")
