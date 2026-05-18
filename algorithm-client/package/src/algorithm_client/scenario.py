from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Literal

from algorithm_client.cubes import Cubes
from algorithm_client.exit_zone import ExitZone


@dataclass(frozen=True)
class Scenario:
    """Represents a scenario for an algorithm to solve.

    Attributes:
        width: The width of the warehouse in the scenario. Boxes' x-coordinates
            must be in the range [0, width).
        height: The height of the warehouse in the scenario.
        depth: The depth of the warehouse in the scenario.
        start: The initial positions of the boxes in the scenario.
        requirements: The target positions of the boxes in the scenario. Note
            that some boxes may not have a target position.
        name: The name of the scenario.
        box_type: The type of box.
        exit_zone: The exit zone of the scenario.
        zone_problem: Whether a scenario is about moving boxes to a target locations or to an exit zone.
    """

    width: int
    height: int
    depth: int
    start: Cubes
    requirements: Cubes
    name: str
    box_type: Literal[1, 2]
    exit_zone: ExitZone
    zone_problem: bool

    def to_json(self):
        return {
            "width": self.width,
            "height": self.height,
            "depth": self.depth,
            "start": self.start.to_json(),
            "requirements": self.requirements.to_json(),
            "name": self.name,
            "box_type": self.box_type,
            "exit_zone": self.exit_zone.to_json(),
            "zone_problem": self.zone_problem,
        }

    @classmethod
    def from_json(cls, data: dict) -> Scenario:
        return cls(
            width=data["width"],
            height=data["height"],
            depth=data["depth"],
            start=Cubes.from_json(data["start"]),
            requirements=Cubes.from_json(data["requirements"]),
            name=data["name"],
            box_type=data["box_type"],
            exit_zone=ExitZone.from_json(data["exit_zone"]),
            zone_problem=data["zone_problem"],
        )

    @classmethod
    def from_file(cls, file_path: str) -> Scenario:
        with open(file_path) as f:
            return cls.from_json(json.load(f))

    def to_file(self, file_name: str | None = None):
        if file_name is None:
            file_name = self.name + ".json"

        with open(file_name, "w") as file:
            json.dump(self.to_json(), file, indent=2)
