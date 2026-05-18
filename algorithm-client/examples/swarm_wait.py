import asyncio
import random

from algorithm_client.client import Client
from algorithm_client.pending_move import MoveError
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def node_algorithm(client: Client, scenario: Scenario, id: int) -> None:
    state = scenario.start

    while True:
        moves = []
        while len(moves) == 0:
            await asyncio.sleep(random.random())
            moves = state.get_available_moves(
                id,
                width=scenario.width,
                height=scenario.height,
                depth=scenario.depth,
            )

        move = random.choice(moves)
        pending_move = await client.send_move(move)
        try:
            await pending_move.executed()
            state.apply_move(move)
        except MoveError:
            # In this case, moves can collide, since each node is unaware of
            # the decision that the other nodes make. If a move fails, we just
            # ignore the error and try again.
            pass


async def algorithm(client: Client, scenario: Scenario) -> None:
    await asyncio.gather(
        *(node_algorithm(client, scenario, box.id) for box in scenario.start)
    )


def main():
    asyncio.run(
        start_client(
            algorithm,
            token="TEST_TOKEN",
            name="Swarm Wait",
            host="localhost",
            port=7071,
        )
    )


if __name__ == "__main__":
    main()
