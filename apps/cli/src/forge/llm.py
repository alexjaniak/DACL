"""Claude API client with context loading and tool-use loop."""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import AsyncIterator

import anthropic

from forge.tools import TOOL_DEFINITIONS, execute_tool

DEFAULT_MODEL = "claude-sonnet-4-6"


def _find_contexts_dir() -> Path | None:
    """Locate the contexts/ directory relative to the repo root."""
    root_env = os.environ.get("FORGE_REPO_ROOT")
    if root_env:
        p = Path(root_env) / "contexts"
        if p.is_dir():
            return p

    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            p = Path(result.stdout.strip()) / "contexts"
            if p.is_dir():
                return p
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return None


def _load_system_prompt() -> str:
    """Build a system prompt from context files."""
    parts = ["You are Forge, an autonomous agent orchestration assistant."]

    contexts_dir = _find_contexts_dir()
    if contexts_dir:
        for md_file in sorted(contexts_dir.glob("*.md")):
            content = md_file.read_text().strip()
            if content:
                parts.append(f"--- {md_file.stem} ---\n{content}")

    parts.append(
        "You have access to GitHub tools. Use them when the user asks about "
        "issues, pull requests, or repository management."
    )
    return "\n\n".join(parts)


class LLMClient:
    """Manages a conversation with Claude including tool use."""

    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise LLMConfigError(
                "ANTHROPIC_API_KEY environment variable is not set. "
                "Set it to your Anthropic API key to use the chat."
            )
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = os.environ.get("FORGE_MODEL", DEFAULT_MODEL)
        self._system_prompt = _load_system_prompt()
        self._messages: list[dict] = []

    def send_message(self, user_text: str) -> AsyncIterator[str]:
        """Send a user message and yield streamed text chunks.

        This is a generator that handles the full tool-use loop:
        1. Send user message to Claude
        2. If Claude responds with tool_use, execute tools and continue
        3. Yield text chunks as they arrive
        """
        self._messages.append({"role": "user", "content": user_text})
        yield from self._run_turn()

    def _run_turn(self):
        """Run one turn of the conversation, handling tool use recursively."""
        while True:
            with self._client.messages.stream(
                model=self._model,
                max_tokens=4096,
                system=self._system_prompt,
                messages=self._messages,
                tools=TOOL_DEFINITIONS,
            ) as stream:
                collected_content = []
                has_tool_use = False

                for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "text":
                            pass
                        elif event.content_block.type == "tool_use":
                            has_tool_use = True
                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield event.delta.text

                response = stream.get_final_message()
                collected_content = response.content

            self._messages.append({"role": "assistant", "content": collected_content})

            if not has_tool_use or response.stop_reason != "tool_use":
                break

            tool_results = []
            for block in collected_content:
                if block.type == "tool_use":
                    result = execute_tool(block.name, block.input)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        }
                    )

            self._messages.append({"role": "user", "content": tool_results})


class LLMConfigError(Exception):
    """Raised when LLM configuration is invalid."""
