import asyncio
import random

from algorithm_client.client import Client
from algorithm_client.cubes import Cube, Cubes
from algorithm_client.pending_move import MoveError
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def node_algorithm(client: Client, scenario: Scenario, id: int) -> None:
    state = scenario.start

    while True:
        moves = []
        while len(moves) == 0:
            moves = state.get_available_moves(
                id,
                width=scenario.width,
                height=scenario.height,
                depth=scenario.depth,
            )

            if len(moves) == 0:
                await asyncio.sleep(0.1)

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
    if scenario.name == "right-10" or scenario.name == "DEMO_SCENARIO":
        await client.skip_scenario()

    await asyncio.gather(
        *(node_algorithm(client, scenario, box.id) for box in scenario.start)
    )


def main():
    # custom scenarios
    my_scenario1 = Scenario(
        width=5,
        height=5,
        depth=5,
        start=Cubes([Cube(id=1, x=0, y=0, z=0)]),
        requirements=Cubes([Cube(id=1, x=1, y=0, z=0)]),
        name="my_scenario1",
    )
    my_scenario2 = Scenario(
        width=5,
        height=5,
        depth=5,
        start=Cubes([Cube(id=1, x=0, y=0, z=0), Cube(id=2, x=1, y=0, z=0)]),
        requirements=Cubes([Cube(id=1, x=1, y=0, z=3)]),
        name="my_scenario2",
    )
    my_scenario3 = Scenario(
        width=5,
        height=5,
        depth=5,
        start=Cubes([Cube(id=1, x=0, y=0, z=0)]),
        requirements=Cubes([Cube(id=1, x=1, y=0, z=0)]),
        name="my_scenario1",
    )

    asyncio.run(
        start_client(
            algorithm,
            token="TEST_TOKEN",
            name="Swarm Skip",
            url="ws://localhost:7071",
            custom_scenarios=[my_scenario1, my_scenario2, my_scenario3],
        )
    )


if __name__ == "__main__":
    main()
