import asyncio

from algorithm_client import Client
from algorithm_client.moves import Move
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def algorithm(client: Client, _: Scenario) -> None:
    while True:
        pending_move = await client.send_move(Move(1, 1, 0, 0))
        await pending_move.executed()


def main():
    asyncio.run(
        start_client(
            algorithm, token="TEST_TOKEN", name="Move 1", host="localhost", port=7071
        )
    )


if __name__ == "__main__":
    main()
