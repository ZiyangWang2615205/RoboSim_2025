import asyncio
import random

from algorithm_client import Client, Scenario, start_client
from algorithm_client.moves import Move
from algorithm_client.pending_move import MoveError


async def algorithm(client: Client, scenario: Scenario):
    if scenario.box_type != 2:
        await client.skip_scenario()
        return

    ids = [x.id for x in scenario.start]

    while True:
        id = random.choice(ids)
        action = random.choice(["move", "displace", "withdraw", "extend", "retract"])

        if action == "move":
            moves = [
                Move(id, 1, 0, 0),
                Move(id, -1, 0, 0),
                Move(id, 0, 0, 1),
                Move(id, 0, 0, -1),
            ]

            try:
                pending_move = await client.send_move(random.choice(moves))
                await pending_move.accepted()
            except MoveError:
                pass
        elif action == "displace":
            try:
                pending_action = await client.displace_legs(id)
                await pending_action.accepted()
            except MoveError:
                pass
        elif action == "withdraw":
            try:
                pending_action = await client.withdraw_legs(id)
                await pending_action.accepted()
            except MoveError:
                pass
        elif action == "extend":
            try:
                pending_action = await client.extend_legs(id)
                await pending_action.accepted()
            except MoveError:
                pass
        elif action == "retract":
            try:
                pending_action = await client.retract_legs(id)
                await pending_action.accepted()
            except MoveError:
                pass


async def main():
    await start_client(
        algorithm, token="TEST_TOKEN", name="Type 2", url="ws://localhost:7071"
    )


if __name__ == "__main__":
    asyncio.run(main())
