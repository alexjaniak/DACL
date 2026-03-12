import click

from forge_cli.logs import logs
from forge_cli.webhook import wh


@click.group()
def main():
    """Forge — agent orchestration CLI."""
    pass


main.add_command(logs)
main.add_command(wh)
