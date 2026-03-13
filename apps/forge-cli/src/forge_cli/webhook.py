import os

import click


@click.command()
@click.option("--port", type=int, default=None, help="Port for the webhook server")
def wh(port):
    """Start the webhook monitor."""
    if port is not None:
        os.environ["FORGE_WEBHOOK_PORT"] = str(port)

    # Signal that we were invoked via `forge wh` to suppress the
    # deprecation warning inside the webhook monitor.
    os.environ["_FORGE_WH_INVOKED"] = "1"

    from forge_webhook.main import run

    run()
