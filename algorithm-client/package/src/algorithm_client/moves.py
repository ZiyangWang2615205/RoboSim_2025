from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Move:
    """A single move.

    Attributes:
        id: The ID of the cube to move.
        dx: The change in x position. Must be 1, 0 or -1.
        dy: The change in y position.
        dz: The change in z position.
    """

    id: int
    dx: int
    dy: int
    dz: int

    def __init__(self, cube_id: int, dx: int, dy: int, dz: int):
        self.id = cube_id
        self.dx = dx
        self.dy = dy
        self.dz = dz

    def to_json(self) -> dict[str, int]:
        return {
            "id": self.id,
            "dx": self.dx,
            "dy": self.dy,
            "dz": self.dz,
        }

    @classmethod
    def from_json(cls, json: dict[str, int]) -> Move:
        return cls(json["id"], json["dx"], json["dy"], json["dz"])

    def __eq__(self, other):
        return self.id == other.id and self.dx == other.dx and self.dz == other.dz


class Moves:
    """A simple wrapper around a list of moves."""

    _moves: list[Move]

    def __init__(self, moves: list[Move] | None = None) -> None:
        if moves is None:
            moves = []
        self._moves = []
        self._moves = moves

    def add_move(self, move: Move) -> None:
        """Add a move to the list of moves."""
        self._moves.append(move)

    def remove_move(self, move: Move) -> None:
        """Remove a move from the list of moves."""
        self._moves.remove(move)

    def to_json(self) -> list[dict[str, int]]:
        """Convert the list of moves to an object that is JSON serializable."""
        return [move.to_json() for move in self._moves]

    @classmethod
    def from_json(cls, json: list[dict[str, int]]) -> Moves:
        return cls([Move.from_json(move) for move in json])

    def get_moves(self) -> list[Move]:
        return self._moves

    def __iter__(self):
        return iter(self._moves)

    def __len__(self):
        return len(self._moves)

    def __getitem__(self, index: int):
        return self._moves[index]


class RejectedAction:
    """An action bundled with error information"""

    id: int
    message: str

    def __init__(self, box_id: int, message: str):
        self.id = box_id
        self.message = message

    @classmethod
    def from_json(cls, json: dict[str, Any]) -> RejectedAction:
        return cls(json["id"], json["message"])
