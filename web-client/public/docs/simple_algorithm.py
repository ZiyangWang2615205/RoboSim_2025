""" Simple algorithm used to help user quick start our project """

import asyncio

from algorithm_client.client import Client
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client

# Load scenario of simple algorithm
scenario_data = {
    "name": "simple_scenario",
    "width": 100,
    "height": 100,
    "depth": 100,
    "start": [
        {"id": 1, "x": 0, "y": 0, "z": 0},
        {"id": 2, "x": 1, "y": 0, "z": 0},
        {"id": 3, "x": 0, "y": 0, "z": 1},
        {"id": 4, "x": 3, "y": 0, "z": 2},
        {"id": 5, "x": 2, "y": 0, "z": 3},
        {"id": 6, "x": 2, "y": 0, "z": 1},
        {"id": 7, "x": 2, "y": 1, "z": 1},
        {"id": 8, "x": 4, "y": 0, "z": 0},
        {"id": 9, "x": 1, "y": 0, "z": 3},
    ],
    "requirements": [
        {"id": 1, "x": 0, "y": 0, "z": 0},
        {"id": 2, "x": 1, "y": 0, "z": 0},
        {"id": 3, "x": 0, "y": 0, "z": 1},
        {"id": 4, "x": 3, "y": 0, "z": 2},
        {"id": 5, "x": 1, "y": 1, "z": 0},
        {"id": 6, "x": 2, "y": 0, "z": 1},
        {"id": 7, "x": 2, "y": 1, "z": 1},
        {"id": 8, "x": 4, "y": 0, "z": 0},
        {"id": 9, "x": 1, "y": 0, "z": 3},
    ],
    "box_type": 1,
    "exit_zone": {
        "x1": 0,
        "x2": 0,
        "y1": 0,
        "y2": 0,
        "z1": 0,
        "z2": 0,
    },
}

scenario = Scenario.from_json(scenario_data)

def find_target_box(state, requirements):
    """ Find the box that should be moving """
    for target_cube in requirements:
        cube = state.get_cube(target_cube.id)
        if cube is None:
            continue

        current_position = (cube.x, cube.y, cube.z)
        target_position = (target_cube.x, target_cube.y, target_cube.z)

        if current_position != target_position:
            return target_cube

    return None


def manhattan_distance(x, y, z, target):
    """ Calculate Manhattan distance between two cubes """
    return abs(x - target[0]) + abs(y - target[1]) + abs(z - target[2])


async def algorithm(client: Client, scenario: Scenario):
    """ Main algorithm to move boxes to their target locations """
    state = scenario.start
    width = int(scenario.width)
    height = int(scenario.height)
    depth = int(scenario.depth)

    target_cube = find_target_box(state, scenario.requirements)
    if target_cube is None:
        print("Scenario already completed.")
        return

    target_box_id = target_cube.id
    target_position = (target_cube.x, target_cube.y, target_cube.z)

    print(f"Moving box {target_box_id} to {target_position}")

    while True:
        cube = state.get_cube(target_box_id)
        if cube is None:
            print(f"Box {target_box_id} not found.")
            await client.fail_scenario()
            return

        current_position = (cube.x, cube.y, cube.z)
        if current_position == target_position:
            print("Target reached.")
            return

        target_moves = state.get_available_moves(
            target_box_id,
            width=width,
            height=height,
            depth=depth,
        )

        if not target_moves:
            print("No available moves for target box.")
            await client.fail_scenario()
            return

        best_move = None
        # set infinite distance as best distance at first
        best_distance = float("inf")

        for move in target_moves:
            new_x = cube.x + move.dx
            new_y = cube.y + move.dy
            new_z = cube.z + move.dz

            distance = manhattan_distance(new_x, new_y, new_z, target_position)

            if distance < best_distance:
                best_distance = distance
                best_move = move

        pending_move = await client.send_move(best_move)
        await pending_move.executed()
        state.apply_move(best_move)


def main():
    asyncio.run(
        start_client(
            algorithm,
            token="Your Tokens",
            name="simple algorithm",
            url="ws://our-web-url/ws",
            custom_scenarios=[scenario],
        )
    )


if __name__ == "__main__":
    main()


