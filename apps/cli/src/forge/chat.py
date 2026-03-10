from __future__ import annotations

import asyncio
from functools import partial
from typing import Iterator

from textual.app import ComposeResult
from textual.containers import VerticalScroll
from textual.widgets import Collapsible, Input, Markdown, Static
from textual.widget import Widget

from forge.llm import LLMClient, StreamChunk


class UserMessage(Static):
    """A user message in the chat history."""

    DEFAULT_CSS = ""

    def __init__(self, text: str) -> None:
        super().__init__(f"> {text}", classes="user-message")


class ThinkingBlock(Static):
    """A thinking block rendered with dimmed italic styling."""

    DEFAULT_CSS = ""

    def __init__(self, text: str = "") -> None:
        super().__init__(text, classes="thinking-block")


class ToolCallBlock(Collapsible):
    """A collapsible block showing a tool call name and input."""

    DEFAULT_CSS = ""

    def __init__(self, tool_name: str, tool_input: str = "") -> None:
        self._tool_input_widget = Static(tool_input, classes="tool-input")
        super().__init__(
            self._tool_input_widget,
            title=f"Tool: {tool_name}",
            classes="tool-call-block",
            collapsed=True,
        )

    def update_input(self, text: str) -> None:
        self._tool_input_widget.update(text)


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

        loop = asyncio.get_running_loop()
        stream = await loop.run_in_executor(
            None, partial(self._llm.stream_response, text)
        )

        def _next_chunk(it: Iterator[StreamChunk]) -> StreamChunk | None:
            return next(it, None)

        text_parts: list[str] = []
        thinking_parts: list[str] = []
        tool_input_parts: list[str] = []
        text_widget: AssistantMessage | None = None
        thinking_widget: ThinkingBlock | None = None
        current_tool: ToolCallBlock | None = None
        has_content = False

        while True:
            chunk = await loop.run_in_executor(None, _next_chunk, stream)
            if chunk is None:
                break

            if chunk.type == "thinking":
                has_content = True
                if thinking_widget is None:
                    thinking_widget = ThinkingBlock()
                    await history.mount(thinking_widget)
                thinking_parts.append(chunk.content)
                thinking_widget.update("".join(thinking_parts))

            elif chunk.type == "text":
                has_content = True
                if text_widget is None:
                    thinking_widget = None
                    thinking_parts.clear()
                    text_widget = AssistantMessage()
                    await history.mount(text_widget)
                text_parts.append(chunk.content)
                text_widget.update("".join(text_parts))

            elif chunk.type == "tool_use":
                has_content = True
                if chunk.tool_name:
                    text_widget = None
                    text_parts.clear()
                    thinking_widget = None
                    thinking_parts.clear()
                    tool_input_parts.clear()
                    current_tool = ToolCallBlock(chunk.tool_name)
                    await history.mount(current_tool)
                elif chunk.tool_input and current_tool is not None:
                    tool_input_parts.append(chunk.tool_input)
                    current_tool.update_input("".join(tool_input_parts))

            elif chunk.type == "error":
                has_content = True
                await history.mount(SystemMessage(chunk.content))

            elif chunk.type == "result":
                has_content = True

            history.scroll_end(animate=False)

        if not has_content:
            await history.mount(AssistantMessage("*(no response)*"))
            history.scroll_end(animate=False)
