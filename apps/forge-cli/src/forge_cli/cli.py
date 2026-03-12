import click

from forge_cli.agents import add, remove
from forge_cli.cron import cron
from forge_cli.logs import logs
from forge_cli.webhook import wh


@click.group()
def main():
    """Forge — agent orchestration CLI."""


main.add_command(add)
main.add_command(remove)
main.add_command(cron)
main.add_command(logs)
main.add_command(wh)
