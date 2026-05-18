from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass
class ExitZone:
    """The exit zone in the warehouse. x1,y1,z1, form first corner of the cuboid zone and x2,y2,z2 form the second. Anything between these coordinates is in the zone."""

    x1: int
    x2: int
    y1: int
    y2: int
    z1: int
    z2: int

    @classmethod
    def from_json(cls, json: dict[str, int]) -> ExitZone:
        return cls(**json)

    def to_json(self):
        return asdict(self)
