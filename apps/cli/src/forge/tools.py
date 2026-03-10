"""GitHub tool definitions for the Claude API tool-use loop."""

from __future__ import annotations

import json
import subprocess


TOOL_DEFINITIONS = [
    {
        "name": "create_issue",
        "description": "Create a new GitHub issue in the specified repository.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format (e.g. 'alexjaniak/DACL').",
                },
                "title": {
                    "type": "string",
                    "description": "Issue title.",
                },
                "body": {
                    "type": "string",
                    "description": "Issue body content (markdown).",
                },
                "labels": {
                    "type": "string",
                    "description": "Comma-separated list of labels to apply.",
                },
            },
            "required": ["repo", "title"],
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
                    "type": "string",
                    "description": "Comma-separated labels to filter by.",
                },
                "state": {
                    "type": "string",
                    "description": "Issue state: 'open', 'closed', or 'all'.",
                    "enum": ["open", "closed", "all"],
                },
            },
            "required": ["repo"],
        },
    },
    {
        "name": "view_issue",
        "description": "View a specific GitHub issue including its body and comments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "number": {
                    "type": "integer",
                    "description": "Issue number.",
                },
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
                    "description": "PR state: 'open', 'closed', 'merged', or 'all'.",
                    "enum": ["open", "closed", "merged", "all"],
                },
            },
            "required": ["repo"],
        },
    },
    {
        "name": "view_pr",
        "description": "View a specific pull request including its body and comments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "repo": {
                    "type": "string",
                    "description": "Repository in owner/name format.",
                },
                "number": {
                    "type": "integer",
                    "description": "Pull request number.",
                },
            },
            "required": ["repo", "number"],
        },
    },
]


def _run_gh(args: list[str], timeout: int = 30) -> str:
    """Run a gh CLI command and return its stdout."""
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            return f"Error: {result.stderr.strip()}"
        return result.stdout.strip()
    except FileNotFoundError:
        return "Error: gh CLI is not installed or not on PATH."
    except subprocess.TimeoutExpired:
        return "Error: command timed out."


def execute_tool(name: str, input_data: dict) -> str:
    """Execute a GitHub tool by name and return the result as a string."""
    repo = input_data.get("repo", "")
    repo_flag = ["-R", repo] if repo else []

    if name == "create_issue":
        args = ["issue", "create"] + repo_flag
        args += ["--title", input_data["title"]]
        if input_data.get("body"):
            args += ["--body", input_data["body"]]
        if input_data.get("labels"):
            for label in input_data["labels"].split(","):
                args += ["--label", label.strip()]
        return _run_gh(args)

    if name == "list_issues":
        args = ["issue", "list"] + repo_flag
        if input_data.get("labels"):
            for label in input_data["labels"].split(","):
                args += ["--label", label.strip()]
        if input_data.get("state"):
            args += ["--state", input_data["state"]]
        args += ["--json", "number,title,state,labels"]
        output = _run_gh(args)
        try:
            issues = json.loads(output)
            lines = []
            for issue in issues:
                labels = ", ".join(l["name"] for l in issue.get("labels", []))
                label_str = f" [{labels}]" if labels else ""
                lines.append(f"#{issue['number']} {issue['title']}{label_str}")
            return "\n".join(lines) if lines else "No issues found."
        except (json.JSONDecodeError, KeyError):
            return output

    if name == "view_issue":
        args = ["issue", "view", str(input_data["number"])] + repo_flag
        args += ["--comments"]
        return _run_gh(args)

    if name == "list_prs":
        args = ["pr", "list"] + repo_flag
        if input_data.get("state"):
            args += ["--state", input_data["state"]]
        args += ["--json", "number,title,state"]
        output = _run_gh(args)
        try:
            prs = json.loads(output)
            lines = []
            for pr in prs:
                lines.append(f"#{pr['number']} {pr['title']} ({pr['state']})")
            return "\n".join(lines) if lines else "No pull requests found."
        except (json.JSONDecodeError, KeyError):
            return output

    if name == "view_pr":
        args = ["pr", "view", str(input_data["number"])] + repo_flag
        args += ["--comments"]
        return _run_gh(args)

    return f"Error: unknown tool '{name}'."
