import click
from algorithm_client import start_client
from algorithm_client.client import asyncio

from fill_remove.__about__ import __version__
from fill_remove.algorithm import algorithm


@click.command(
    context_settings={"help_option_names": ["-h", "--help"]},
)
@click.version_option(version=__version__, prog_name="fill-remove")
@click.option(
    "--url",
    default="ws://localhost:7071",
    show_default=True,
    help="The URL of the server to connect to",
)
@click.option(
    "--token",
    default="TEST_TOKEN",
    show_default=True,
    help="The authorization token",
)
def fill_remove(url: str, token: str):
    asyncio.run(
        start_client(
            algorithm,
            url=url,
            token=token,
            name="Fill-Remove",
            publish_runs=True,
        )
    )
