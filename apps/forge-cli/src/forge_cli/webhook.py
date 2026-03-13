import os
import shutil

import click


def _find_forge_webhook() -> str:
    """Find the forge-webhook binary on PATH."""
    path = shutil.which("forge-webhook")
    if path:
        return path
    raise click.ClickException(
        "forge-webhook not found on PATH. Install the forge-webhook package first."
    )


@click.command()
@click.option("--port", type=int, default=None, help="Port for the webhook server")
def wh(port):
    """Start the webhook monitor."""
    env = os.environ.copy()
    if port is not None:
        env["FORGE_WEBHOOK_PORT"] = str(port)

    binary = _find_forge_webhook()
    # Signal to forge-webhook that it was invoked via `forge wh`,
    # so it can suppress its deprecation warning.
    env["_FORGE_WH_INVOKED"] = "1"
    # argv is [binary] with no additional args — forge-webhook reads
    # its configuration (e.g. port) from environment variables.
    os.execve(binary, [binary], env)
