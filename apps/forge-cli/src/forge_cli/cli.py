import click

from forge_cli.cron import cron


@click.group()
def main():
    """Forge — agent orchestration CLI."""


main.add_command(cron)
