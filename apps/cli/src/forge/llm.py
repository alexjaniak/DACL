"""LLM client for Forge CLI — Claude API integration with tool use."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import AsyncIterator

import anthropic

from forge.tools import TOOL_DEFINITIONS, execute_tool

DEFAULT_MODEL = "claude-sonnet-4-6"
CONTEXTS_DIR = Path(__file__).resolve().parents[4] / "contexts"


class LLMError(Exception):
    """Raised when the LLM client encounters a configuration error."""


def _load_system_prompt() -> str:
    """Build the system prompt from context files."""
    parts = ["You are Forge, an autonomous agent orchestration assistant."]
    if CONTEXTS_DIR.is_dir():
        for md in sorted(CONTEXTS_DIR.glob("*.md")):
            parts.append(f"\n\n--- {md.stem} ---\n{md.read_text()}")
    return "".join(parts)


def _get_client() -> anthropic.AsyncAnthropic:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise LLMError(
            "ANTHROPIC_API_KEY is not set. "
            "Export it in your shell: export ANTHROPIC_API_KEY=sk-..."
        )
    return anthropic.AsyncAnthropic(api_key=api_key)


async def stream_response(
    messages: list[dict],
) -> AsyncIterator[str]:
    """Send messages to Claude and yield text chunks.

    Handles the tool-use loop: when Claude requests tool calls, this function
    executes them, feeds results back, and continues streaming until a final
    text response is produced.
    """
    client = _get_client()
    model = os.environ.get("FORGE_MODEL", DEFAULT_MODEL)
    system = _load_system_prompt()

    working_messages = list(messages)

    while True:
        collected_text = ""
        tool_calls: list[dict] = []

        async with client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system,
            messages=working_messages,
            tools=TOOL_DEFINITIONS,
        ) as stream:
            async for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        tool_calls.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input_json": "",
                        })
                elif event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        collected_text += event.delta.text
                        yield event.delta.text
                    elif event.delta.type == "input_json_delta":
                        if tool_calls:
                            tool_calls[-1]["input_json"] += event.delta.partial_json

        if not tool_calls:
            break

        # Build the assistant message content blocks
        assistant_content: list[dict] = []
        if collected_text:
            assistant_content.append({"type": "text", "text": collected_text})
        for tc in tool_calls:
            assistant_content.append({
                "type": "tool_use",
                "id": tc["id"],
                "name": tc["name"],
                "input": json.loads(tc["input_json"]) if tc["input_json"] else {},
            })
        working_messages.append({"role": "assistant", "content": assistant_content})

        # Execute tools and build tool results
        tool_results = []
        for tc in tool_calls:
            input_data = json.loads(tc["input_json"]) if tc["input_json"] else {}
            result = execute_tool(tc["name"], input_data)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc["id"],
                "content": result,
            })
        working_messages.append({"role": "user", "content": tool_results})
