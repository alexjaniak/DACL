from __future__ import annotations

import os
import shutil
import subprocess
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

    def stream_response(self, user_text: str) -> Iterator[str]:
        """Spawn claude CLI and yield stdout lines as they arrive.

        Runs the subprocess in the calling thread. The caller (chat.py)
        is responsible for running this in a worker thread so the TUI
        stays responsive.
        """
        cmd = [
            "claude",
            "--print",
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
                yield line
        finally:
            proc.stdout.close()
            proc.wait()

        if proc.returncode != 0:
            stderr = proc.stderr.read().strip()
            proc.stderr.close()
            if stderr:
                yield f"\n[error] Claude CLI failed: {stderr}"
        else:
            proc.stderr.close()
