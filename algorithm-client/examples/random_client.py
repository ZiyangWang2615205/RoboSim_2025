import asyncio
import random

from algorithm_client.client import Client
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def algorithm(client: Client, scenario: Scenario):
    state = scenario.start

    while True:
        moves = state.get_all_available_moves(
            width=scenario.width,
            height=scenario.height,
            depth=scenario.depth,
        )

        move = random.choice(moves)

        pending_move = await client.send_move(move)
        # Wait for the move to finish executing
        await pending_move.executed()

        # Apply the move to our local state
        state.apply_move(move)


def main():
    asyncio.run(
        start_client(
            algorithm,
            token="TEST_TOKEN",
            name="Random Client",
            url="ws://localhost:7071",
            publish_runs=True,
        )
    )


if __name__ == "__main__":
    main()
