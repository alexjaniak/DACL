"""Shared path and config helpers for forge-cli."""

import json
import os
import subprocess
import sys

import click


def repo_root():
    """Return the repository root directory."""
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        click.echo("Error: not inside a git repository.", err=True)
        sys.exit(1)


def cron_jobs_path():
    return os.path.join(repo_root(), "agent-kernel", "cron", "cron-jobs.json")


def load_cron_jobs(path):
    if not os.path.exists(path):
        return {"stagger": True, "jobs": []}
    with open(path) as f:
        return json.load(f)


def save_cron_jobs(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
