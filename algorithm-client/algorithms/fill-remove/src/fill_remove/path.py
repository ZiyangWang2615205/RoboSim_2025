from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from heapdict import heapdict

if TYPE_CHECKING:
    from fill_remove.boxes import Boxes


@dataclass()
class _PathNode:
    x: int
    y: int
    z: int
    height_cost: int
    cost: int | None = None
    previous: _PathNode | None = None


class _Nodes:
    _nodes: list[_PathNode]
    _width: int
    _height: int
    _depth: int

    def __init__(self, width: int, height: int, depth: int, boxes: Boxes):
        self._width = width
        self._height = height
        self._depth = depth

        self._nodes = [
            _PathNode(x, y, z, abs(y - boxes.stack_height(x, z)))
            for x in range(width)
            for y in range(height)
            for z in range(depth)
        ]

    def get(self, x: int, y: int, z: int) -> _PathNode | None:
        if x < 0 or x >= self._width or y < 0 or y >= self._height or z < 0 or z >= self._depth:
            return None

        return self._nodes[x * self._height * self._depth + y * self._depth + z]


def find_path(boxes: Boxes, start: tuple[int, int, int], target: tuple[int, int, int]) -> list[tuple[int, int, int]]:
    """Find a path from one location to another in a warehouse, minimising the
    path length and the total difference in height between the path and the
    boxes. Uses Dijkstra's algorithm.

    Args:
        boxes: The warehouse to search.
        start: The source location.
        target: The target location.

    Returns:
        A list of locations making up the path from start to target
        (inclusive).
    """

    if start == target:
        return [start]

    # Create empty nodes for every location in the warehouse
    grid = _Nodes(int(boxes.width), int(boxes.height), int(boxes.depth), boxes)

    start_node = grid.get(*start)

    if not start_node:
        msg = f"Invalid start location: {start}"
        raise ValueError(msg)

    start_node.cost = 0

    queue = heapdict()
    queue[start] = start_node.cost
    explored: set[tuple[int, int, int]] = set()

    final_node = None

    while final_node is None and len(queue) > 0:
        position: tuple[int, int, int]
        cost: int
        position, cost = queue.popitem()

        node = grid.get(position[0], position[1], position[2])

        if node is None:
            msg = f"Invalid position: {position}"
            raise AssertionError(msg)

        if node.x == target[0] and node.y == target[1] and node.z == target[2]:
            final_node = node
            break

        for [x, y, z] in possible_locations(node.x, node.y, node.z):
            if (x, y, z) in explored:
                continue

            new_node = grid.get(x, y, z)

            if new_node is None:
                continue

            if new_node.cost is None or cost + new_node.height_cost + 1 < new_node.cost:
                new_node.cost = cost + new_node.height_cost + 1
                new_node.previous = node
                queue[(x, y, z)] = new_node.cost

        explored.add((node.x, node.y, node.z))

    if final_node is None:
        msg = "No path found"
        raise ValueError(msg)

    path = []
    while final_node is not None:
        path.append((final_node.x, final_node.y, final_node.z))
        final_node = final_node.previous

    path.reverse()

    return path


def possible_locations(x: int, y: int, z: int) -> list[tuple[int, int, int]]:
    return [
        (new_x, new_y, new_z)
        for (new_x, new_z) in [(x + 1, z), (x - 1, z), (x, z + 1), (x, z - 1)]
        for new_y in [y - 1, y, y + 1]
    ]
