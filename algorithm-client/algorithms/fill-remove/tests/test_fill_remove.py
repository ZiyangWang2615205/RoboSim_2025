from algorithm_client import Cube, Cubes, Move

from fill_remove.boxes import Boxes
from fill_remove.fill_remove import fill_box, remove_box


def test_fill():
    boxes = Boxes(
        Cubes(
            [
                Cube(0, 0, 0, 0),
                Cube(1, 0, 0, 1),
                Cube(2, 0, 1, 1),
                Cube(3, 0, 2, 1),
                Cube(4, 0, 3, 1),
            ]
        ),
        2,
        2,
        2,
    )

    assert fill_box(boxes, 1, 0, 1) == [Move(0, 1, 0, 0), Move(0, 0, 0, 1)]
    assert fill_box(boxes, 1, 1, 1) is None


def test_remove():
    boxes = Boxes(
        Cubes(
            [
                Cube(0, 0, 0, 0),
                Cube(1, 1, 0, 0),
                Cube(2, 1, 1, 0),
                Cube(3, 0, 0, 1),
                Cube(4, 0, 1, 1),
                Cube(5, 0, 2, 1),
                Cube(6, 0, 3, 1),
            ]
        ),
        2,
        2,
        2,
    )

    assert remove_box(boxes, 0, 0, 0) == [Move(2, 0, -1, 1), Move(0, 1, 1, 0)]
