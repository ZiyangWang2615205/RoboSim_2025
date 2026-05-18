from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Coroutine

from algorithm_client.client import Client

if TYPE_CHECKING:
    from algorithm_client.scenario import Scenario


async def start_client(
    algorithm: Callable[[Client, Scenario], Coroutine[Any, Any, None]],
    token: str,
    name: str,
    *,
    publish_runs: bool = False,
    url: str = "ws://robosim-alb-473145297.eu-north-1.elb.amazonaws.com/ws",
    custom_scenarios: list[Scenario] | None = None,
    log_file: str | None = None,
) -> Client:
    """Create and start a client.

    Args:
        algorithm: An asynchronous function that takes a client and a scenario
            as arguments, and uses the client to send moves to the server.
        token: The token to use to connect to the server.
        name: The name of the algorithm.
        publish_runs: Whether to publish runs to the leaderboard.
        url: The url to connect to. Defaults to the RoboSim server.
        custom_scenarios: A list of Scenarios.
            If specified, the algorithm will be run on these scenarios,
            instead of the default scenarios.
        log_file: path to a file to output logs in
    """
    client = Client(
        algorithm=algorithm,
        token=token,
        name=name,
        publish_runs=publish_runs,
        custom_scenarios=custom_scenarios,
        log_file=log_file,
    )

    await client.start(url)

    return client
