"""Chat pane with LLM-powered responses."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Input, Static
from textual.widget import Widget

from forge.llm import LLMError, stream_response


class ChatMessage(Static):
    """A single message in the chat history."""

    def __init__(self, sender: str, text: str) -> None:
        super().__init__(f"[bold]{sender}:[/bold] {text}")


class ChatPane(Widget):
    """Chat interface with scrollable history and text input."""

    def __init__(self) -> None:
        super().__init__()
        self._messages: list[dict] = []
        self._current_response: ChatMessage | None = None
        self._current_text: str = ""

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
        history.scroll_end(animate=False)

        self._messages.append({"role": "user", "content": text})
        self._send_to_llm()

    @property
    def _history(self) -> VerticalScroll:
        return self.query_one("#chat-history", VerticalScroll)

    def _send_to_llm(self) -> None:
        """Start streaming a response from the LLM."""
        self._current_text = ""
        self._current_response = ChatMessage("Forge", "...")
        self._history.mount(self._current_response)
        self._history.scroll_end(animate=False)

        self.run_worker(self._stream_worker(), exclusive=True, group="llm")

    async def _stream_worker(self) -> None:
        """Worker coroutine that streams LLM response chunks."""
        try:
            async for chunk in stream_response(self._messages):
                self._current_text += chunk
                if self._current_response:
                    self._current_response.update(
                        f"[bold]Forge:[/bold] {self._current_text}"
                    )
                    self._history.scroll_end(animate=False)
        except LLMError as exc:
            self._current_text = str(exc)
            if self._current_response:
                self._current_response.update(
                    f"[bold]Forge:[/bold] [red]{self._current_text}[/red]"
                )
        except Exception as exc:
            self._current_text = f"Error: {exc}"
            if self._current_response:
                self._current_response.update(
                    f"[bold]Forge:[/bold] [red]{self._current_text}[/red]"
                )

        self._messages.append({"role": "assistant", "content": self._current_text})
        self._current_response = None
