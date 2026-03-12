import click

from forge_cli.agents import add, remove
from forge_cli.logs import logs


@click.group()
def main():
    """Forge — agent orchestration CLI."""
    pass


main.add_command(add)
main.add_command(remove)
main.add_command(logs)
