from __future__ import annotations

import random
from typing import TYPE_CHECKING, Literal

from algorithm_client.cubes import Cube, Cubes
from algorithm_client.scenario import Scenario

if TYPE_CHECKING:
    from algorithm_client.exit_zone import ExitZone


def generate_scenario(
    width: int = 7,
    height: int = 7,
    depth: int = 7,
    no_of_boxes_to_move: int | None = None,
    name: str = "generated_scenario",
    box_type: Literal[1, 2] = 1,
) -> Scenario:
    """Creates a random scenario.

    Args:
        width: Width dimension of scenario (going east from the origin).
        height: Height dimension of scenario (going up from the origin).
        depth: Depth dimension of scenario (going north from the origin).
        no_of_boxes_to_move: Number of generated boxes which will have
            to be moved to a new location. If this number is invalid or
            not provided, it will be calculated randomly based on the
            number of generated boxes.
        name: Name of scenario. Default is 'generated_scenario'.
            The type of the boxes in the scenario will be appended
            to the end of the name.

    """
    layout: list[list[int]] = [[0] * depth for _ in range(width)]
    volume: int = width * height * depth
    min_no_of_boxes: int = volume // 10
    max_no_of_boxes: int = volume // 5
    max_height: int = height // 2
    no_of_boxes: int = random.randint(min_no_of_boxes, max_no_of_boxes)

    start_list: list[Cube] = []
    curr_box_count: int = 0
    curr_id: int = 1

    name = name + " - Type " + str(box_type)

    while curr_box_count < no_of_boxes:
        x = random.randint(0, width - 1)
        z = random.randint(0, depth - 1)
        if layout[x][z] < max_height:
            y = layout[x][z]
            start_list.append(Cube(curr_id, x, y, z))
            layout[x][z] += 1
            curr_id += 1
            curr_box_count += 1

    start: Cubes = Cubes(start_list)

    if not no_of_boxes_to_move or no_of_boxes_to_move < 1 or no_of_boxes_to_move > no_of_boxes:
        no_of_boxes_to_move: int = random.randint(1, no_of_boxes // 2)

    boxes_to_move: list[Cube] = random.sample(start_list, no_of_boxes_to_move)
    chosen_destinations_layout: list[tuple[int, int]] = []
    requirement_list: list[Cube] = []

    for box in boxes_to_move:
        x = box.x
        z = box.z
        new_x = random.randint(0, width - 1)
        new_z = random.randint(0, depth - 1)

        while (
            (new_x == x and new_z == z)
            or (new_x, new_z) in chosen_destinations_layout
            or layout[new_x][new_z] >= max_height
        ):
            new_x = random.randint(0, width - 1)
            new_z = random.randint(0, depth - 1)

        chosen_destinations_layout.append((new_x, new_z))
        new_y = layout[new_x][new_z]
        requirement_list.append(Cube(box.id, new_x, new_y, new_z))
        layout[new_x][new_z] += 1

    # Setting random exit zone at z = 0 to 1, and random x and y coordinates
    x1 = random.randint(0, width - 1)
    x2 = random.randint(x1 - 3, x1 + 3)
    y1 = random.randint(0, width - 1)
    y2 = random.randint(y1 - 3, y1 + 3)
    exit_zone: ExitZone = {x1, x2, y1, y2, 0, 1}

    requirements: Cubes = Cubes(requirement_list)

    return Scenario(width, height, depth, start, requirements, name, box_type, exit_zone, False)
