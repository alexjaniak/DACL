from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


def _load_contexts() -> str:
    contexts_dir = Path(__file__).resolve().parents[4] / "contexts"
    if not contexts_dir.is_dir():
        repo_root = os.environ.get("FORGE_REPO_ROOT", "")
        if repo_root:
            contexts_dir = Path(repo_root) / "contexts"
    if not contexts_dir.is_dir():
        return ""

    parts: list[str] = []
    for md_file in sorted(contexts_dir.glob("*.md")):
        content = md_file.read_text()
        parts.append(f"## {md_file.stem}\n\n{content}")
    return "\n\n---\n\n".join(parts)


SYSTEM_PROMPT = (
    "You are Forge, an AI assistant for managing an autonomous agent "
    "orchestration platform. You help users monitor and manage GitHub "
    "issues, pull requests, and agent workflows.\n\n"
    "Be concise and direct. Lead with the answer.\n\n"
    "# Context Files\n\n"
    "The following context documents describe the orchestration framework:\n\n"
    f"{_load_contexts()}"
)


@dataclass
class StreamChunk:
    """A structured chunk from the Claude CLI stream-json output."""

    type: str  # "text", "tool_use", "thinking", "result", "error"
    content: str
    tool_name: str = ""
    tool_input: str = ""


def _parse_stream_event(data: dict) -> StreamChunk | None:
    """Parse a single stream-json event into a StreamChunk."""
    event_type = data.get("type", "")

    if event_type == "content_block_start":
        block = data.get("content_block", {})
        block_type = block.get("type", "")
        if block_type == "tool_use":
            return StreamChunk(
                type="tool_use",
                content="",
                tool_name=block.get("name", "unknown"),
            )
        if block_type == "thinking":
            return StreamChunk(type="thinking", content=block.get("thinking", ""))
        if block_type == "text":
            return StreamChunk(type="text", content=block.get("text", ""))
        return None

    if event_type == "content_block_delta":
        delta = data.get("delta", {})
        delta_type = delta.get("type", "")
        if delta_type == "text_delta":
            return StreamChunk(type="text", content=delta.get("text", ""))
        if delta_type == "thinking_delta":
            return StreamChunk(type="thinking", content=delta.get("thinking", ""))
        if delta_type == "input_json_delta":
            return StreamChunk(
                type="tool_use",
                content="",
                tool_input=delta.get("partial_json", ""),
            )
        return None

    if event_type == "result":
        return StreamChunk(type="result", content=data.get("result", ""))

    if event_type == "error":
        err = data.get("error", {})
        msg = err.get("message", "") if isinstance(err, dict) else str(err)
        return StreamChunk(type="error", content=msg)

    return None


class LLMClient:
    def __init__(self) -> None:
        if not shutil.which("claude"):
            raise RuntimeError(
                "Claude CLI binary not found on PATH. "
                "Install it to use the Forge chat interface."
            )
        token = os.environ.get("CLAUDE_CODE_OAUTH_TOKEN", "")
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not token and not api_key:
            raise RuntimeError(
                "No auth configured. Set CLAUDE_CODE_OAUTH_TOKEN or "
                "ANTHROPIC_API_KEY to use the Forge chat interface."
            )

    def stream_response(self, user_text: str) -> Iterator[StreamChunk]:
        """Spawn claude CLI with stream-json output and yield structured chunks.

        Runs the subprocess in the calling thread. The caller (chat.py)
        is responsible for running this in a worker thread so the TUI
        stays responsive.
        """
        cmd = [
            "claude",
            "--output-format", "stream-json",
            "--dangerously-skip-permissions",
        ]

        if SYSTEM_PROMPT:
            cmd.extend(["--append-system-prompt", SYSTEM_PROMPT])

        cmd.append(user_text)

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        try:
            for line in iter(proc.stdout.readline, ""):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    yield StreamChunk(type="error", content=f"Malformed JSON: {line}")
                    continue
                chunk = _parse_stream_event(data)
                if chunk is not None:
                    yield chunk
        finally:
            proc.stdout.close()
            proc.wait()

        if proc.returncode != 0:
            stderr = proc.stderr.read().strip()
            proc.stderr.close()
            if stderr:
                yield StreamChunk(type="error", content=f"Claude CLI failed: {stderr}")
        else:
            proc.stderr.close()
