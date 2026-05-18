from algorithm_client import Cube, Cubes

from fill_remove.boxes import Boxes
from fill_remove.path import find_path


def test_find_path():
    boxes = Boxes(Cubes([]), 5, 5, 5)

    assert find_path(boxes, (0, 0, 0), (0, 0, 0)) == [(0, 0, 0)]
    assert find_path(boxes, (0, 0, 0), (0, 0, 1)) == [(0, 0, 0), (0, 0, 1)]
    assert find_path(boxes, (0, 0, 0), (0, 0, 2)) == [(0, 0, 0), (0, 0, 1), (0, 0, 2)]

    boxes = Boxes(Cubes([Cube(1, 0, 0, 1)]), 5, 5, 5)

    assert find_path(boxes, (0, 0, 0), (0, 0, 2)) == [(0, 0, 0), (0, 1, 1), (0, 0, 2)]

    boxes = Boxes(
        Cubes(
            [
                Cube(1, 0, 0, 1),
                Cube(2, 0, 0, 2),
                Cube(3, 0, 1, 2),
                Cube(4, 0, 2, 2),
                Cube(5, 0, 0, 3),
            ]
        ),
        5,
        5,
        5,
    )

    assert find_path(boxes, (0, 0, 0), (0, 0, 4)) == [
        (0, 0, 0),
        (0, 1, 1),
        (0, 2, 2),
        (0, 1, 3),
        (0, 0, 4),
    ]
