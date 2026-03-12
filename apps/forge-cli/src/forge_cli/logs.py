import os
import subprocess
import sys

import click


def _find_view_sh():
    """Locate view.sh relative to the repo root."""
    try:
        repo_root = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        click.echo("Error: not inside a git repository.", err=True)
        sys.exit(1)

    view_sh = os.path.join(repo_root, "agent-kernel", "logs", "view.sh")
    if not os.path.isfile(view_sh):
        click.echo(f"Error: view.sh not found at {view_sh}", err=True)
        sys.exit(1)

    return view_sh


@click.command()
@click.argument("agent_id", required=False, default=None)
@click.option("-f", "--follow", is_flag=True, help="Follow logs live.")
@click.option("-n", "--lines", default=50, show_default=True, help="Number of lines to show.")
def logs(agent_id, follow, lines):
    """View agent logs with color-coded output."""
    view_sh = _find_view_sh()

    args = [view_sh]
    if follow:
        args.append("-f")
    args.extend(["-n", str(lines)])
    if agent_id:
        args.append(agent_id)

    os.execvp(view_sh, args)
