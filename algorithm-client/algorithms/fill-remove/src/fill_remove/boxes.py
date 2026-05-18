from __future__ import annotations

from algorithm_client import Cube, Cubes, Move


class Boxes:
    _cubes: Cubes
    _layout: dict[tuple[int, int], list[dict[int, int] | int]]  # { (x, z) : [{y : id}, length_of_dict] }
    _height: int
    _width: int
    _depth: int

    def __init__(self, cubes: Cubes, height: int, width: int, depth: int):
        self._height = height
        self._width = width
        self._depth = depth
        self._layout = {}
        self._cubes = copy_cubes(cubes)

        for cube in cubes:
            if (cube.x, cube.z) not in self._layout:
                self._layout[(cube.x, cube.z)] = [{cube.y: cube.id}, 1]
            else:
                stack_data: list[dict[int, int] | int] = self._layout[(cube.x, cube.z)]
                stack_data[0][cube.y] = cube.id
                stack_data[1] += 1

    @property
    def height(self) -> int:
        return self._height

    @property
    def width(self) -> int:
        return self._width

    @property
    def depth(self) -> int:
        return self._depth

    def cube_location(self, box_id: int) -> tuple[int, int, int] | None:
        cube = self._cubes.get_cube(box_id)

        if cube is None:
            return None

        return cube.x, cube.y, cube.z

    def cube_id_at(self, x: int, y: int, z: int) -> int | None:
        if (x, z) not in self._layout:
            return None

        y_coord_to_id: dict[int, int] = self._layout[(x, z)][0]
        if y in y_coord_to_id:
            return y_coord_to_id[y]

        return None

    def stack_height(self, x: int, z: int) -> int:
        if (x, z) not in self._layout:
            return 0

        return self._layout[(x, z)][1]

    def apply_move(self, move: Move):
        location: tuple[int, int, int] = self.cube_location(move.id)
        if location:
            x, y, z = location
            stack_data: tuple[dict[int, int], int] = self._layout[(x, z)]
            stack_data[1] -= 1
            if stack_data[1] == 0:
                del self._layout[(x, z)]
            else:
                del stack_data[0][y]

            x += move.dx
            y += move.dy
            z += move.dz

            if (x, z) not in self._layout:
                self._layout[(x, z)] = [{y: move.id}, 1]
            else:
                new_stack_data: list[dict[int, int] | int] = self._layout[(x, z)]
                new_stack_data[0][y] = move.id
                new_stack_data[1] += 1

            self._cubes.apply_move(move)

    def apply_moves(self, moves: list[Move]):
        for move in moves:
            self.apply_move(move)

    def revert_move(self, move: Move):
        self.apply_move(Move(move.id, -move.dx, -move.dy, -move.dz))

    def revert_moves(self, moves: list[Move]):
        for move in reversed(moves):
            self.revert_move(move)


def copy_cubes(cubes: Cubes) -> Cubes:
    """Create a deep copy of `cubes`"""

    return Cubes([Cube(cube.id, cube.x, cube.y, cube.z) for cube in cubes])
