from __future__ import annotations

import random
from contextlib import contextmanager
from typing import TYPE_CHECKING

from algorithm_client import Move

if TYPE_CHECKING:
    from fill_remove.boxes import Boxes


def fill_box(
    boxes: Boxes,
    x: int,
    y: int,
    z: int,
    current_location: tuple[int, int, int] | None = None,
) -> list[Move] | None:
    """Calculates the moves required to fill the empty space at the given
    location.

    Args:
        boxes: The current state of the boxes in the warehouse.
        x: The x coordinate of the empty space.
        y: The y coordinate of the empty space.
        z: The z coordinate of the empty space.
        location: The location of the box we are currently moving. This box
            will not be moved.

    Returns:
        A list of moves, or None if a solution is not found.
    """
    if current_location:
        return fill(boxes, Explored([(current_location[0], current_location[2])]), x, y, z)

    return fill(boxes, Explored(), x, y, z)


def remove_box(
    boxes: Boxes,
    x: int,
    y: int,
    z: int,
    location: tuple[int, int, int] | None = None,
) -> list[Move] | None:
    """Calculates the moves required to remove the box at the given location.

    Args:
        boxes: The current state of the boxes in the warehouse.
        x: The x coordinate of the box.
        y: The y coordinate of the box.
        z: The z coordinate of the box.
        location: The location of the box we are currently moving. This box
            will not be moved.

    Returns:
        A list of moves, or None if a solution is not found.
    """
    if location:
        return remove(boxes, Explored([(location[0], location[2])]), x, y, z)

    return remove(boxes, Explored(), x, y, z)


class Explored:
    """
    A simple wrapper around a set of locations that have already been visited.
    """

    _set: set[tuple[int, int]]

    def __init__(self, locations: list[tuple[int, int]] | None = None):
        if not locations:
            locations = []

        self._set = set(locations)

    @contextmanager
    def add(self, x: int, z: int):
        """
        A context manager that adds a location to the set, then removes it after
        the block is exited.
        """
        self._set.add((x, z))
        yield
        self._set.remove((x, z))

    def __contains__(self, item: tuple[int, int]):
        return item in self._set


def outside_bounds(boxes: Boxes, x: int, z: int) -> bool:
    return x < 0 or x >= int(boxes.width) or z < 0 or z >= int(boxes.depth)


def fill_cost(height: int, target_height: int) -> int:
    """
    If there is an empty space at `target_height`, and we want to fill it with
    a neighbouring stack with height `height`, how many boxes do we have to add
    or remove from the stack to make this possible?
    """
    top_box = height - 1
    cost = max(abs(top_box - target_height) - 1, 0)

    if cost == 0 and height == 0:
        # If the stack is full, then we can't move a box on top of it, so we
        # must, at the very least, remove the top box.
        return 1

    return cost


def remove_cost(height: int, current_height: int, max_height: int) -> int:
    """
    If there is a box at `height`, and we want to move it to a stack of height
    `current_height`, how many boxes do we need to add or remove from the stack
    to make this possible?
    """
    cost = max(abs(current_height - height) - 1, 0)

    if cost == 0 and height == max_height:
        # If the stack is full, then we can't move a box on top of it, so we
        # must, at the very least, remove the top box.
        return 1

    return cost


def fill(boxes: Boxes, explored: Explored, x: int, y: int, z: int) -> list[Move] | None:
    with explored.add(x, z):
        possible_locations = [(x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)]
        random.shuffle(possible_locations)

        # Filter out locations that are outside the bounds of the warehouse, or
        # that have already been visited, and then sort by the fill cost.
        possible_locations = sorted(
            filter(
                lambda location: not outside_bounds(boxes, *location) and location not in explored,
                possible_locations,
            ),
            key=lambda location: fill_cost(boxes.stack_height(*location), y),
        )

        for location in possible_locations:
            result = try_fill(boxes, explored, location, x, y, z)

            if result is not None:
                return result

    return None


def try_fill(boxes: Boxes, explored: Explored, location: tuple[int, int], x: int, y: int, z: int) -> list[Move] | None:
    """Attempts to fill an empty space specified by `(x, y, z)`, using a box
    from the neighbouring stack at `location`.
    """
    height = boxes.stack_height(*location)
    moves: list[Move] = []

    if height <= y - 1 or height == 0:
        # If there are no boxes in the stack, or the stack is too low for the
        # top box to move to the empty space, then we need to add boxes to the
        # stack until it is high enough.
        for i in range(height, max(y, 1)):
            result = fill(boxes, explored, location[0], i, location[1])

            if result is None:
                boxes.revert_moves(moves)
                return None

            moves.extend(result)
    if height > y + 1:
        # If the stack is too high for the top box to move to the empty space,
        # then we need to remove boxes from the stack until the top box can
        # move down
        for i in range(height - 1, y + 1, -1):
            result = remove(boxes, explored, location[0], i, location[1])

            if result is None:
                boxes.revert_moves(moves)
                return None

            moves.extend(result)

    # We now know that the box at the top of the stack can be moved to the
    # empty space.
    box_y = boxes.stack_height(*location) - 1
    box_id = boxes.cube_id_at(location[0], box_y, location[1])

    if box_id is None:
        msg = "Box must exist"
        raise AssertionError(msg)

    move = Move(
        box_id,
        x - location[0],
        y - box_y,
        z - location[1],
    )

    boxes.apply_move(move)
    moves.append(move)

    return moves


def remove(boxes: Boxes, explored: Explored, x: int, y: int, z: int) -> list[Move] | None:
    box_id = boxes.cube_id_at(x, y, z)

    if box_id is None:
        msg = f"No cube at {x}, {y}, {z}"
        raise ValueError(msg)

    with explored.add(x, z):
        possible_locations = [(x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)]
        random.shuffle(possible_locations)

        # Filter out locations that are outside the bounds of the warehouse, or
        # that have already been visited, and then sort by the remove cost.
        possible_locations = sorted(
            filter(
                lambda location: not outside_bounds(boxes, *location) and location not in explored,
                possible_locations,
            ),
            key=lambda location: remove_cost(boxes.stack_height(*location), y, int(boxes.height)),
        )

        for location in possible_locations:
            result = try_remove(boxes, explored, box_id, location, x, y, z)

            if result is not None:
                return result

    return None


def try_remove(
    boxes: Boxes,
    explored: Explored,
    box_id: int,
    location: tuple[int, int],
    x: int,
    y: int,
    z: int,
) -> list[Move] | None:
    """Attempts to remove the box at `(x, y, z)`, moving it to the neighbouring
    stack at `location`.
    """
    height = boxes.stack_height(*location)
    moves: list[Move] = []

    if height < y - 1:
        # If the stack is not high enough to support the box moving on top of
        # it, we need to add boxes to the stack until it is high enough.
        for i in range(height, y - 1):
            result = fill(boxes, explored, location[0], i, location[1])

            if result is None:
                boxes.revert_moves(moves)
                return None

            moves.extend(result)

    if height >= y + 1 or height == int(boxes.height):
        # If the stack is too high for the box to move on top of it, or the
        # stack is full, then we need to remove boxes from the stack until the
        # box can move onto it.
        for i in range(height - 1, min(y, int(boxes.height) - 2), -1):
            result = remove(boxes, explored, location[0], i, location[1])

            if result is None:
                boxes.revert_moves(moves)
                return None

            moves.extend(result)

    # We now know that the box can be moved to the top of the stack.
    height = boxes.stack_height(*location)

    move = Move(
        box_id,
        location[0] - x,
        height - y,
        location[1] - z,
    )

    boxes.apply_move(move)
    moves.append(move)

    return moves
