from __future__ import annotations

from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from algorithm_client.moves import Move

_ActionType = Literal["move", "displace_legs", "withdraw_legs", "extend_legs", "retract_legs"]


class Action:
    _action: _ActionType
    _id: int
    _move: Move | None

    def __init__(self, action: _ActionType, box_id: int, move: Move | None = None):
        self._action = action
        self._id = box_id
        self._move = move

    def __str__(self) -> str:
        if self._move:
            return f"{self._move}"

        return f"Action(action='{self._action}', id={self._id})"

    @property
    def id(self) -> int:
        return self._id

    def to_json(self):
        if self._move:
            return {
                "kind": "move",
                "id": self._id,
                "dx": self._move.dx,
                "dy": self._move.dy,
                "dz": self._move.dz,
            }

        if self._action == "displace_legs":
            return {
                "kind": "leg",
                "type": "displace",
                "id": self._id,
            }

        if self._action == "withdraw_legs":
            return {
                "kind": "leg",
                "type": "withdraw",
                "id": self._id,
            }

        if self._action == "extend_legs":
            return {
                "kind": "leg",
                "type": "extend",
                "id": self._id,
            }

        if self._action == "retract_legs":
            return {
                "kind": "leg",
                "type": "retract",
                "id": self._id,
            }

        msg = "Unknown action type: " + str(self._action)
        raise ValueError(msg)
