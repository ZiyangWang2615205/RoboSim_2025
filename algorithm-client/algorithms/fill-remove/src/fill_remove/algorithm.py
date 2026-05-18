from __future__ import annotations

import asyncio
from asyncio import Queue
from typing import Iterable

from algorithm_client import Client, Cubes, Move, PendingAction, Scenario

from fill_remove.boxes import Boxes
from fill_remove.fill_remove import fill_box, remove_box
from fill_remove.path import find_path


async def algorithm(client: Client, scenario: Scenario):
    if scenario.box_type != 1:
        await client.skip_scenario()
        return

    queue: Queue[Move] = Queue(maxsize=20)

    moves_task = asyncio.create_task(_add_moves(scenario, queue))

    pending_moves: list[tuple[PendingAction, Move]] = []

    boxes = Boxes(scenario.start, scenario.height, scenario.width, scenario.depth)

    try:
        while True:
            next_move_task = asyncio.create_task(queue.get())

            done, _ = await asyncio.wait([moves_task, next_move_task], return_when=asyncio.FIRST_COMPLETED)

            # Make sure we handle any errors thrown in `_add_moves()`
            if moves_task in done:
                await moves_task

            move = await next_move_task
            print(move)

            pending_moves = await ensure_compatible(boxes, pending_moves, move)

            pending_move = await client.send_move(move)
            await pending_move.accepted()

            pending_moves.append((pending_move, move))
    except ValueError as e:
        print(e)
        await client.fail_scenario()


async def ensure_compatible(boxes: Boxes, pending_moves: list[tuple[PendingAction, Move]], move: Move):
    """Ensures that the moves in `pending_moves` are all compatible (i.e. can
    be executed at the same time) with `move`.

    If a move in `pending_moves` is not compatible with `move`, then we wait
    for it and all moves before it to be executed before continuing.

    Args:
        boxes: The current state of the warehouse before any of the moves from
            `pending_moves` are applied.
        pending_moves: Moves that have not yet been executed.
        move: The move to apply.

    Returns:
        The moves that have still not been executed (the moves in
        `pending_moves` after the last incompatible move).
    """

    min_compatible_index = 0
    for i, (_, other_move) in enumerate(pending_moves):
        if not is_compatible(boxes, move, other_move):
            for pending_move, move_to_apply in pending_moves[min_compatible_index : i + 1]:
                await pending_move.executed()
                boxes.apply_move(move_to_apply)

            min_compatible_index = i + 1

    return pending_moves[min_compatible_index:]


def is_compatible(boxes: Boxes, move_1: Move, move_2: Move):
    """Checks if two moves are compatible (can be executed at the same time).

    Assumes that the moves are valid on their own."""

    # Since we can assume that `move_1` and `move_2` are valid if executed one
    # after the other, checking that they are compatible is fairly simple: we
    # just check that they don't operate on the same box, and that their source
    # location and target locations' (x, z) coordinates don't match.

    if move_1.id == move_2.id:
        return False

    box_1 = boxes.cube_location(move_1.id)
    box_2 = boxes.cube_location(move_2.id)

    if box_1 is None or box_2 is None:
        msg = "Invalid move"
        raise ValueError(msg)

    if box_1[0] == box_2[0] and box_1[2] == box_2[2]:
        return False

    target_location_1 = (
        box_1[0] + move_1.dx,
        box_1[1] + move_1.dy,
        box_1[2] + move_1.dz,
    )

    target_location_2 = (
        box_2[0] + move_2.dx,
        box_2[1] + move_2.dy,
        box_2[2] + move_2.dz,
    )

    if target_location_1[0] == target_location_2[0] and target_location_1[2] == target_location_2[2]:
        return False

    return True


async def _add_moves(scenario: Scenario, queue: Queue[Move]):
    for move in _calculate_moves(scenario):
        await queue.put(move)


def _calculate_moves(scenario: Scenario) -> Iterable[Move]:
    """Calculate the moves to take for a given scenario.

    Args:
        scenario: The scenario to complete.

    Yields:
        A set of moves to take.

    Raises:
        ValueError: If the scenario cannot be completed.
    """
    state = Boxes(scenario.start, scenario.height, scenario.width, scenario.depth)

    while not is_complete(state, scenario.requirements):
        # The algorithm works by moving the boxes one at a time.
        for target_box in scenario.requirements:
            location = state.cube_location(target_box.id)

            if location is None:
                msg = f"No cube with id {target_box.id}"
                raise ValueError(msg)

            x, y, z = location

            # Find a path from the current location to the target location
            path = find_path(state, (x, y, z), (target_box.x, target_box.y, target_box.z))

            current_height = state.stack_height(x, z)

            # Remove any boxes above the current box.
            if current_height > y + 1:
                for i in range(current_height - 1, y, -1):
                    result = remove_box(state, x, i, z)

                    if result is None:
                        msg = "Scenario not solvable"
                        raise ValueError(msg)

                    yield from result

            # Attempt to move the box to the next coordinate in the path
            for next_x, next_y, next_z in path[1:]:
                # The height of the stack that the box wants to move on top of.
                height = state.stack_height(next_x, next_z)

                if height > next_y:
                    # If the stack is too high, remove boxes until the stack has
                    # the correct height for the box to move on top of it.
                    for i in range(height - 1, next_y - 1, -1):
                        result = remove_box(state, next_x, i, next_z, (x, y, z))

                        if result is None:
                            msg = "Scenario not solvable"
                            raise ValueError(msg)

                        yield from result
                elif height < next_y:
                    # If the stack is too low, add boxes to the stack until it is
                    # the correct height for the box to move on top of it.
                    for i in range(height, next_y):
                        result = fill_box(state, next_x, i, next_z, (x, y, z))

                        if result is None:
                            msg = "Scenario not solvable"
                            raise ValueError(msg)

                        yield from result

                # Move onto the stack.
                move = Move(
                    target_box.id,
                    next_x - x,
                    next_y - y,
                    next_z - z,
                )

                state.apply_move(move)
                yield move

                x, y, z = next_x, next_y, next_z


def is_complete(state: Boxes, requirements: Cubes):
    for requirement in requirements:
        location = state.cube_location(requirement.id)
        if location is None or location != (
            requirement.x,
            requirement.y,
            requirement.z,
        ):
            return False

    return True
