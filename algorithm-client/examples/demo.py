import asyncio

from algorithm_client.client import Client
from algorithm_client.moves import Move, Moves
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client

move_list = [
    Moves([Move(1, 0, 0, 1), Move(2, 1, 0, 0)]),
    Moves([Move(1, 0, 0, 1), Move(2, 1, 0, 0), Move(3, 1, -1, 0)]),
    Moves([Move(0, 0, 0, 1), Move(2, 0, 0, 1), Move(3, 1, 0, 0)]),
    Moves([Move(0, 1, 0, 0), Move(3, 0, 0, 1)]),
    Moves([Move(0, 1, 1, 0)]),
]


async def algorithm(client: Client, _: Scenario) -> None:
    for moves in move_list:
        pending_move = None
        for move in moves:
            pending_move = await client.send_move(move)
            await pending_move.accepted()

        if pending_move:
            # Wait for the final move in the set to be executed
            await pending_move.executed()


def main():
    asyncio.run(
        start_client(
            algorithm,
            token="TEST_TOKEN",
            name="Demo",
            host="localhost",
            port=7071,
        )
    )


if __name__ == "__main__":
    main()
