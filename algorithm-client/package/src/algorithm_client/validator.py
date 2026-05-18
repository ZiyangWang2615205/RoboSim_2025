from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from algorithm_client.cubes import Cube, Cubes
    from algorithm_client.moves import Move, Moves


def is_valid_box(new_box: Cube, cubes: Cubes, width: int, height: int, depth: int) -> bool:
    """
    The function will return if the given single move is valid or not
    Args:
        new_box(Cube)       : a Cube will be added
        cubes(List(Cube))   : a list of cubes in scenario
        width(int)          : the width of the scenario
        height(int)         : the height of the scenario
        depth(int)          : the depth of the scenario
    Returns:
        bool                : valid(true), invalid(false)
    """
    # initialize the cube set
    cube_set = cubes

    # initialize the boundaries of the warehouse with passed data
    low_x = 0
    low_y = 0
    low_z = 0
    high_x = width
    high_y = height
    high_z = depth

    # check that the box lies within the bounds of the warehouse
    if (
        new_box.x >= high_x
        or new_box.x < low_x
        or new_box.y >= high_y
        or new_box.y < low_y
        or new_box.z >= high_z
        or new_box.z < low_z
    ):
        return False
    # var used to record attainablity
    attainablity = new_box.y == 0

    for cube in cube_set:
        # check box id doesn't already exist
        if cube.id == new_box.id:
            return False
        # check that that position isn't already occupied
        if cube.x == new_box.x and cube.y == new_box.y and cube.z == new_box.z:
            return False
        # check that the z position is attainable given the current stack of boxes
        if new_box.y > 0 and cube.x == new_box.x and cube.y == (new_box.y - 1) and cube.z == new_box.z:
            attainablity = True

    if not attainablity:
        return False

    # passed all test, box is valid
    return True


def is_valid_move(move: Move, cubes: Cubes, width: int, height: int, depth: int):
    """
    The function will return if the given single move is valid or not
    Args:
        move(Move)          : a single move to be added
        cubes(List(Cube))   : a list of cubes in scenario
        width(int)          : the width of the scenario
        height(int)         : the height of the scenario
        depth(int)          : the depth of the scenario
    Returns:
        bool                : valid(true), invalid(false)
    """
    # initialize the boundaries of the warehouse with passed data
    low_x = 0
    low_y = 0
    low_z = 0
    high_x = width
    high_y = height
    high_z = depth

    # calculate the change in x, y, and z positions
    dx = move.dx
    dy = move.dy
    dz = move.dz

    # find the moving cube
    moving_cube = cubes.get_cube(move.id)

    # Case1: Cube id not found
    if moving_cube is None:
        return False

    # calculate the final position
    endx = dx + moving_cube.x
    endy = dy + moving_cube.y
    endz = dz + moving_cube.z

    # Case6: Move params are invalid
    if dx not in [0, 1, -1] or dy not in [0, 1, -1] or dz not in [0, 1, -1]:
        return False
    # check if the move is diagonal
    if abs(dx) + abs(dz) != 1:
        return False
    # Case4: Cube moves out of boundary
    if endx < low_x or endx >= high_x or endy < low_y or endy >= high_y or endz < low_z or endz >= high_z:
        return False

    # Case5: Cube will go to unsupported place or underground
    attainablity = endy == 0
    for cube in cubes:
        # check if the box is moving to the unsupported place
        if endy > 0 and cube.x == endx and cube.y == endy - 1 and cube.z == endz:
            attainablity = True
        # Case3: Cube moves to place that already occupid
        if cube.x == endx and cube.y == endy and cube.z == endz:
            return False
        # Case2: Cube has another cube above it
        if cube.x == moving_cube.x and cube.y == moving_cube.y + 1 and cube.z == moving_cube.z:
            return False

    if not attainablity:
        return False
    return True


"""
invalid_move condition:
    Case1: Cube id not found
    Case2: Cube has another cube above it
    Case3: Cube moves to place that already occupid
    Case4: Cube moves out of boundary
    Case5: Cube will go to unsupported place or underground
    Case6: Move params are invalid
    Case7: Cubes move to the same place
    Case8: Collision move
"""


def is_valid_move_set(move_set: Moves, cubes: Cubes, width: int, height: int, depth: int) -> bool:
    """
    The function will return if the given move set is valid or not
    Args:
        move_set(Moves): a list of moves that need to be executed in the same time
        cubes(Cubes)   : a list of cubes in scenario
        width(int)          : the width of the scenario
        height(int)         : the height of the scenario
        depth(int)          : the depth of the scenario

    Returns:
        bool                : valid(true), invalid(false)
    """
    # initialize the boundaries of the warehouse with passed data
    low_x = 0
    low_y = 0
    low_z = 0
    high_x = width
    high_y = height
    high_z = depth

    moving_cubes = []
    stable_cubes = []

    ids = [move.id for move in move_set]

    for cube in cubes:
        if cube.id in ids:
            moving_cubes.append(cube)
        else:
            stable_cubes.append(cube)

    @dataclass
    class Cell:
        move: Move | None = None
        leave: bool = False
        occupied: bool = False
        empty: bool = False

    occupied_mat = [[[Cell() for _ in range(depth)] for _ in range(height)] for _ in range(width)]
    # update stable cubes to matrix
    for cube in stable_cubes:
        occupied_mat[cube.x][cube.y][cube.z].occupied = True
    # update moving cubes to matrix
    for cube in moving_cubes:
        occupied_mat[cube.x][cube.y][cube.z].leave = True

    for move in move_set:
        # Check moves
        cube = cubes.get_cube(move.id)
        # Case1: Cube id not found
        if cube is None:
            return False
        # Case6: Move params are invalid
        if move.dx not in [0, 1, -1] or move.dy not in [0, 1, -1] or move.dz not in [0, 1, -1]:
            return False
        if abs(move.dx) + abs(move.dz) != 1:
            return False

        endx = move.dx + cube.x
        endy = move.dy + cube.y
        endz = move.dz + cube.z
        # Case4: Cube moves out of boundary
        if endx < low_x or endx >= high_x or endy < low_y or endy >= high_y or endz < low_z or endz >= high_z:
            return False

        # Case7: Cubes move to the same place && Case3: Cube moves to place that already occupid
        if not occupied_mat[cube.x + move.dx][cube.y + move.dy][cube.z + move.dz].occupied:
            occupied_mat[cube.x + move.dx][cube.y + move.dy][cube.z + move.dz].occupied = True
        elif occupied_mat[cube.x + move.dx][cube.y + move.dy][cube.z + move.dz].occupied:
            return False

        # Check cube can move before executed
        for other_cube in cubes:
            if other_cube.id == cube.id:
                continue
            # Case2: Cube has another cube above it
            if other_cube.x == cube.x and other_cube.y == cube.y + 1 and other_cube.z == cube.z:
                return False
        occupied_mat[cube.x][cube.y][cube.z].move = move
    # Check after moving
    # Case5: Cube will go to unsupported place or underground
    for move in move_set:
        cube = cubes.get_cube(move.id)

        if cube is None:
            return False

        if not (
            cube.y + move.dy == 0 or occupied_mat[cube.x + move.dx][cube.y + move.dy - 1][cube.z + move.dz].occupied
        ):
            return False
        # Case8: Collision move
        if occupied_mat[cube.x + move.dx][cube.y + move.dy][cube.z + move.dz].leave:
            move1 = occupied_mat[cube.x][cube.y][cube.z].move
            move2 = occupied_mat[cube.x + move.dx][cube.y + move.dy][cube.z + move.dz].move
            if is_opposite_move(move1, move2):
                return False
    return True


def is_opposite_move(move1, move2):
    if move1 is None or move2 is None:
        return False
    return move1.dx == -move2.dx and move1.dy == -move2.dy and move1.dz == -move2.dz
