from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Input, Static
from textual.widget import Widget
from textual.worker import Worker, WorkerState

from forge.llm import LLMClient, LLMConfigError


class ChatMessage(Static):
    """A single message in the chat history."""

    def __init__(self, sender: str, text: str) -> None:
        super().__init__(f"[bold]{sender}:[/bold] {text}")


class ChatPane(Widget):
    """Chat interface with scrollable history and text input."""

    def __init__(self) -> None:
        super().__init__()
        self._llm: LLMClient | None = None
        self._init_error: str | None = None

    def on_mount(self) -> None:
        try:
            self._llm = LLMClient()
        except LLMConfigError as e:
            self._init_error = str(e)
            history = self.query_one("#chat-history", VerticalScroll)
            history.mount(ChatMessage("System", f"[red]{self._init_error}[/red]"))

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

        if self._init_error:
            history.mount(ChatMessage("System", f"[red]{self._init_error}[/red]"))
            history.scroll_end(animate=False)
            return

        response_msg = ChatMessage("Forge", "")
        history.mount(response_msg)
        history.scroll_end(animate=False)

        self.run_worker(
            self._stream_response(text, response_msg, history),
            thread=True,
        )

    def _stream_response(
        self,
        text: str,
        response_msg: ChatMessage,
        history: VerticalScroll,
    ) -> None:
        """Stream LLM response chunks into the response message widget."""
        collected = []
        try:
            for chunk in self._llm.send_message(text):
                collected.append(chunk)
                full_text = "".join(collected)
                self.app.call_from_thread(
                    response_msg.update,
                    f"[bold]Forge:[/bold] {full_text}",
                )
                self.app.call_from_thread(history.scroll_end, animate=False)
        except Exception as e:
            error_text = f"[red]Error: {e}[/red]"
            self.app.call_from_thread(
                response_msg.update,
                f"[bold]Forge:[/bold] {error_text}",
            )
            self.app.call_from_thread(history.scroll_end, animate=False)
