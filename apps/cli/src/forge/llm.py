from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import AsyncIterator

import anthropic

TOOLS = [
    {
        "name": "create_issue",
        "description": "Create a new GitHub issue in the repository.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format (e.g. alexjaniak/DACL).",
                },
                "title": {"type": "string", "description": "Issue title."},
                "body": {"type": "string", "description": "Issue body in markdown."},
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels to apply to the issue.",
                },
            },
            "required": ["repo", "title", "body"],
        },
    },
    {
        "name": "list_issues",
        "description": "List GitHub issues in a repository, optionally filtered by labels and state.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by labels.",
                },
                "state": {
                    "type": "string",
                    "enum": ["open", "closed", "all"],
                    "description": "Filter by state. Defaults to open.",
                },
            },
            "required": ["repo"],
        },
    },
    {
        "name": "view_issue",
        "description": "View a single GitHub issue with its comments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "number": {"type": "integer", "description": "Issue number."},
            },
            "required": ["repo", "number"],
        },
    },
    {
        "name": "list_prs",
        "description": "List pull requests in a repository.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "state": {
                    "type": "string",
                    "enum": ["open", "closed", "merged", "all"],
                    "description": "Filter by state. Defaults to open.",
                },
            },
            "required": ["repo"],
        },
    },
    {
        "name": "view_pr",
        "description": "View a single pull request with its comments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "number": {"type": "integer", "description": "PR number."},
            },
            "required": ["repo", "number"],
        },
    },
]


def _run_gh(*args: str) -> str:
    result = subprocess.run(
        ["gh", *args],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        return f"Error: {result.stderr.strip()}"
    return result.stdout.strip()


def execute_tool(name: str, input_data: dict) -> str:
    repo = input_data.get("repo", "")
    repo_args = ["-R", repo] if repo else []

    if name == "create_issue":
        cmd = ["issue", "create", *repo_args, "--title", input_data["title"], "--body", input_data["body"]]
        for label in input_data.get("labels", []):
            cmd.extend(["--label", label])
        return _run_gh(*cmd)

    if name == "list_issues":
        cmd = ["issue", "list", *repo_args, "--json", "number,title,labels,state"]
        for label in input_data.get("labels", []):
            cmd.extend(["--label", label])
        state = input_data.get("state", "open")
        cmd.extend(["--state", state])
        return _run_gh(*cmd)

    if name == "view_issue":
        return _run_gh("issue", "view", str(input_data["number"]), *repo_args, "--comments")

    if name == "list_prs":
        cmd = ["pr", "list", *repo_args, "--json", "number,title,state,headRefName"]
        state = input_data.get("state", "open")
        cmd.extend(["--state", state])
        return _run_gh(*cmd)

    if name == "view_pr":
        return _run_gh("pr", "view", str(input_data["number"]), *repo_args, "--comments")

    return f"Unknown tool: {name}"


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


SYSTEM_PROMPT = f"""You are Forge, an AI assistant for managing an autonomous agent orchestration platform. You help users monitor and manage GitHub issues, pull requests, and agent workflows.

You have access to GitHub tools for creating and viewing issues and pull requests. Use them when the user asks about project status, wants to create tasks, or needs information about the repository.

Be concise and direct. Lead with the answer.

# Context Files

The following context documents describe the orchestration framework:

{_load_contexts()}
"""


class LLMClient:
    def __init__(self) -> None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY environment variable is not set. "
                "Set it to use the Forge chat interface."
            )
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = os.environ.get("FORGE_MODEL", "claude-sonnet-4-6")
        self._messages: list[dict] = []

    async def stream_response(self, user_text: str) -> AsyncIterator[str]:
        self._messages.append({"role": "user", "content": user_text})

        while True:
            has_tool_use = False
            tool_uses: list[dict] = []
            current_tool: dict | None = None
            input_json = ""

            async with self._client.messages.stream(
                model=self._model,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=self._messages,
                tools=TOOLS,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_start":
                        if event.content_block.type == "tool_use":
                            has_tool_use = True
                            current_tool = {
                                "id": event.content_block.id,
                                "name": event.content_block.name,
                            }
                            input_json = ""
                    elif event.type == "content_block_delta":
                        if event.delta.type == "text_delta":
                            yield event.delta.text
                        elif event.delta.type == "input_json_delta":
                            input_json += event.delta.partial_json
                    elif event.type == "content_block_stop":
                        if current_tool is not None:
                            try:
                                parsed_input = json.loads(input_json) if input_json else {}
                            except json.JSONDecodeError:
                                parsed_input = {}
                            current_tool["input"] = parsed_input
                            tool_uses.append(current_tool)
                            current_tool = None

                response = await stream.get_final_message()

            self._messages.append({"role": "assistant", "content": response.content})

            if not has_tool_use:
                break

            # Execute tools and send results
            tool_results = []
            for tool in tool_uses:
                result = execute_tool(tool["name"], tool["input"])
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool["id"],
                        "content": result,
                    }
                )

            self._messages.append({"role": "user", "content": tool_results})
