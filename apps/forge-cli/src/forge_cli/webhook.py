import os
import shutil
import sys

import click


def _find_forge_webhook() -> str:
    """Find the forge-webhook binary on PATH."""
    path = shutil.which("forge-webhook")
    if path:
        return path
    print(
        "Error: forge-webhook not found on PATH. "
        "Install the forge-webhook package first.",
        file=sys.stderr,
    )
    sys.exit(1)


@click.command()
@click.option("--port", type=int, default=None, help="Port to listen on (default: 8471)")
def wh(port):
    """Start the webhook monitor."""
    env = os.environ.copy()
    if port is not None:
        env["FORGE_WEBHOOK_PORT"] = str(port)

    binary = _find_forge_webhook()
    os.execve(binary, [binary], env)
