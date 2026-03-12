"""forge cron — agent cron job management."""

import os
import subprocess
import sys
from types import SimpleNamespace

import click


def _get_manage():
    """Import and configure manage.py with correct paths resolved via git."""
    try:
        repo_dir = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except subprocess.CalledProcessError:
        click.echo("Error: not inside a git repository", err=True)
        raise SystemExit(1)

    cron_dir = os.path.join(repo_dir, "agent-kernel", "cron")
    if cron_dir not in sys.path:
        sys.path.insert(0, cron_dir)

    import manage

    # Patch path constants so manage.py works from any directory
    manage.SCRIPT_DIR = cron_dir
    manage.KERNEL_DIR = os.path.join(repo_dir, "agent-kernel")
    manage.REPO_DIR = repo_dir
    manage.JOBS_FILE = os.path.join(cron_dir, "cron-jobs.json")
    manage.STATE_FILE = os.path.join(cron_dir, "cron-state.json")
    manage.LOGS_DIR = os.path.join(repo_dir, "agent-kernel", "logs")

    return manage


@click.group()
def cron():
    """Manage agent cron jobs."""


@cron.command()
def apply():
    """Sync crontab to match cron-jobs.json."""
    m = _get_manage()
    m.cmd_apply(SimpleNamespace())


@cron.command()
@click.argument("id")
@click.argument("interval")
@click.argument("prompt")
@click.option("--agentic", is_flag=True, help="Enable tool use")
@click.option("--workspace", is_flag=True, help="Run in isolated git worktree")
@click.option("--context", multiple=True, help="Context file path (repeatable)")
@click.option("--repo", default=None, help="Target repo")
def add(id, interval, prompt, agentic, workspace, context, repo):
    """Add a single cron job."""
    m = _get_manage()
    m.cmd_add(SimpleNamespace(
        id=id, interval=interval, prompt=prompt,
        agentic=agentic, workspace=workspace,
        context=list(context) if context else [], repo=repo,
    ))


@cron.command()
@click.argument("id")
def remove(id):
    """Remove a cron job by ID."""
    m = _get_manage()
    m.cmd_remove(SimpleNamespace(id=id))


@cron.command("list")
def list_jobs():
    """List active cron jobs."""
    m = _get_manage()
    m.cmd_list(SimpleNamespace())


@cron.command()
@click.option("--watch", "-w", is_flag=True, help="Continuously refresh every second")
def status(watch):
    """Show agent timing: last run, next run, countdown."""
    m = _get_manage()
    m.cmd_status(SimpleNamespace(watch=watch))


@cron.command()
@click.argument("id")
def run(id):
    """Run a job once immediately."""
    m = _get_manage()
    m.cmd_run(SimpleNamespace(id=id))


@cron.command()
def clear():
    """Remove all agent-kernel cron jobs."""
    m = _get_manage()
    m.cmd_clear(SimpleNamespace())
