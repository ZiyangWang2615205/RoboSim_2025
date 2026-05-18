from __future__ import annotations

from dataclasses import dataclass

from algorithm_client.moves import Move, Moves
from algorithm_client.validator import is_valid_move


@dataclass
class Cube:
    """
    A cube in the warehouse.

    Attributes:
        id: The ID of the cube.
        x: The x position of the cube.
        y: The y position of the cube.
        z: The z position of the cube.
    """

    id: int
    x: int
    y: int
    z: int


class CubeNotFoundError(Exception):
    """Exception raised when a cube is not found.

    Args:
        cube_id: The ID of the cube that was not found.
    """

    cube_id: int

    def __init__(self, cube_id: int) -> None:
        self.cube_id = cube_id
        super().__init__(f"Cube {cube_id} not found")


class Cubes:
    """A simple set of cubes."""

    _cubes: dict[int, Cube]

    def __init__(self, cubes: list[Cube] | None = None) -> None:
        if cubes is None:
            self._cubes = {}
        else:
            self._cubes = {cube.id: cube for cube in cubes}

    def __eq__(self, value: object, /) -> bool:
        if not isinstance(value, Cubes):
            return NotImplemented
        return self._cubes == value._cubes

    @classmethod
    def from_json(cls, json: list[dict[str, int]]) -> Cubes:
        """Create a set of cubes from a parsed JSON object."""
        return cls([Cube(cube["id"], cube["x"], cube["y"], cube["z"]) for cube in json])

    def to_json(self):
        return [{"id": cube.id, "x": cube.x, "y": cube.y, "z": cube.z} for cube in self._cubes.values()]

    def add_cube(self, cube: Cube) -> None:
        """Add a cube to the set."""
        self._cubes[cube.id] = cube

    def remove_cube(self, cube: Cube) -> None:
        """Remove a cube from the set."""
        if cube.id in self._cubes:
            del self._cubes[cube.id]

    def get_cube(self, cube_id: int) -> Cube | None:
        """Get a cube from the set of cubes."""
        if cube_id in self._cubes:
            return self._cubes[cube_id]
        return None

    def update_cube(self, cube: Cube) -> None:
        """Replace the cube in the set with the same id as `cube`.

        Raises:
            CubeNotFoundError: If the cube is not found in the set.
        """
        if cube.id in self._cubes:
            self._cubes[cube.id] = cube
        else:
            raise CubeNotFoundError(cube.id)

    def get_cube_at(self, x: int, y: int, z: int) -> Cube | None:
        """Get the cube at the given position."""
        for cube in self._cubes.values():
            if cube.x == x and cube.y == y and cube.z == z:
                return cube
        return None

    def apply_move(self, move: Move) -> None:
        """Apply a move to the cubes. Note that this function

        Raises:
            CubeNotFoundError: If the cube corresponding to the move is not found in
                the set.
        """
        cube = self.get_cube(move.id)

        if cube is None:
            raise CubeNotFoundError(move.id)

        cube.x += move.dx
        cube.y += move.dy
        cube.z += move.dz
        self.update_cube(cube)

    def apply_moves(self, moves: Moves):
        """Apply a set of moves to the cubes.

        Raises:
            CubeNotFoundError: If the cube corresponding to a move is not found in
                the set.
        """
        for move in moves:
            self.apply_move(move)

    def get_all_available_moves(self, width: int, height: int, depth: int) -> Moves:
        """Get all available moves for all cubes.

        Args:
            width: The width of the warehouse.
            height: The height of the warehouse.
            depth: The depth of the warehouse.
        """
        moves = []
        for cube in self._cubes.values():
            moves.extend(self.get_available_moves(cube.id, width, height, depth))

        return Moves(moves)

    def get_available_moves(self, cube_id: int, width: int, height: int, depth: int) -> Moves:
        """Get all available moves for a given cube.

        Args:
            cube_id: The ID of the cube.
            width: The width of the warehouse.
            height: The height of the warehouse.
            depth: The depth of the warehouse.

        Raises:
            CubeNotFoundError: If the cube is not found in the set.
        """
        cube = self.get_cube(cube_id)

        if cube is None:
            raise CubeNotFoundError(cube_id)

        moves = []
        # get available moves in four directions, if not available, then check if it can climbs onto or down the box in that direction
        direction = [(1, 0), (-1, 0), (0, 1), (0, -1)]  # dir in dx and dz
        for d in direction:
            move = Move(cube_id, d[0], 0, d[1])
            if is_valid_move(move, self, width, height, depth):
                moves.append(move)
                continue
            move = Move(cube_id, d[0], 1, d[1])
            if is_valid_move(move, self, width, height, depth):
                moves.append(move)
                continue
            move = Move(cube_id, d[0], -1, d[1])
            if is_valid_move(move, self, width, height, depth):
                moves.append(move)
        return Moves(moves)

    def __iter__(self):
        return iter(self._cubes.values())
