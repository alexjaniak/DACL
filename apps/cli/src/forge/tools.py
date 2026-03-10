"""GitHub tool definitions and execution for the Forge LLM."""

from __future__ import annotations

import json
import subprocess

TOOL_DEFINITIONS = [
    {
        "name": "create_issue",
        "description": "Create a new GitHub issue.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "title": {"type": "string", "description": "Issue title."},
                "body": {"type": "string", "description": "Issue body (markdown)."},
                "labels": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Labels to apply.",
                },
            },
            "required": ["repo", "title", "body"],
        },
    },
    {
        "name": "list_issues",
        "description": "List issues in a GitHub repository, optionally filtered by labels and state.",
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
        "description": "View a specific GitHub issue with its comments.",
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
        "description": "List pull requests in a GitHub repository.",
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
        "description": "View a specific pull request with its comments.",
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
    """Run a gh CLI command and return its stdout."""
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
    """Execute a tool by name with the given input and return the result string."""
    repo = input_data.get("repo", "")

    if name == "create_issue":
        cmd = [
            "issue", "create",
            "--repo", repo,
            "--title", input_data["title"],
            "--body", input_data["body"],
        ]
        for label in input_data.get("labels", []):
            cmd.extend(["--label", label])
        return _run_gh(*cmd)

    if name == "list_issues":
        cmd = ["issue", "list", "--repo", repo, "--json", "number,title,state,labels"]
        for label in input_data.get("labels", []):
            cmd.extend(["--label", label])
        state = input_data.get("state", "open")
        cmd.extend(["--state", state])
        raw = _run_gh(*cmd)
        try:
            issues = json.loads(raw)
            lines = []
            for iss in issues:
                labels = ", ".join(l["name"] for l in iss.get("labels", []))
                lines.append(f"#{iss['number']} [{iss['state']}] {iss['title']}  ({labels})")
            return "\n".join(lines) if lines else "No issues found."
        except (json.JSONDecodeError, KeyError):
            return raw

    if name == "view_issue":
        return _run_gh("issue", "view", str(input_data["number"]), "--repo", repo, "--comments")

    if name == "list_prs":
        cmd = ["pr", "list", "--repo", repo, "--json", "number,title,state"]
        state = input_data.get("state", "open")
        cmd.extend(["--state", state])
        raw = _run_gh(*cmd)
        try:
            prs = json.loads(raw)
            lines = []
            for pr in prs:
                lines.append(f"#{pr['number']} [{pr['state']}] {pr['title']}")
            return "\n".join(lines) if lines else "No pull requests found."
        except (json.JSONDecodeError, KeyError):
            return raw

    if name == "view_pr":
        return _run_gh("pr", "view", str(input_data["number"]), "--repo", repo, "--comments")

    return f"Unknown tool: {name}"
