import pytest

from algorithm_client.cubes import Cube, CubeNotFoundError, Cubes
from algorithm_client.moves import Move, Moves


def test_add_cube():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    assert cubes.get_cube(0) == cube


def test_remove_cube():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    cubes.remove_cube(cube)
    assert cubes.get_cube(0) is None


def test_get_cubes():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    assert cubes == Cubes([cube])


def test_get_all_available_moves():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 0, 0, 0))
    cubes.add_cube(Cube(1, 0, 1, 0))
    cubes.add_cube(Cube(2, 0, 0, 2))
    cubes.add_cube(Cube(3, 1, 0, 0))
    cubes.add_cube(Cube(4, 2, 0, 0))
    moves = Moves([])
    moves.add_move(Move(1, 0, -1, 1))  # move down without support but in ground
    moves.add_move(Move(1, 1, 0, 0))  # move left not in ground
    moves.add_move(Move(2, 0, 0, -1))  # move to the same place but different id
    moves.add_move(Move(2, 0, 0, 1))  # noraml move
    moves.add_move(Move(2, 1, 0, 0))  # normal move
    moves.add_move(Move(3, 0, 0, 1))  # normal move
    moves.add_move(Move(3, 1, 1, 0))  # climb up with support
    moves.add_move(Move(4, -1, 1, 0))  # climb up with support
    moves.add_move(Move(4, 1, 0, 0))  # normal move
    moves.add_move(Move(4, 0, 0, 1))  # noraml move

    moves_from_cubes = cubes.get_all_available_moves(width=10, height=10, depth=10)

    assert len(moves.get_moves()) == len(moves_from_cubes.get_moves())
    for move in moves_from_cubes:
        assert move in moves.get_moves()


def test_apply_one_move():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    moves = Moves()
    moves.add_move(Move(0, 1, 1, 1))
    cubes.apply_moves(moves)
    assert cubes.get_cube(0) == Cube(0, 1, 1, 1)


def test_apply_two_moves():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    moves = Moves()
    moves.add_move(Move(0, 1, 1, 1))
    moves.add_move(Move(0, 1, 1, 1))
    cubes.apply_moves(moves)
    assert cubes.get_cube(0) == Cube(0, 2, 2, 2)


def test_apply_two_moves_two_cubes():
    cubes = Cubes()
    cube1 = Cube(0, 0, 0, 0)
    cube2 = Cube(1, 0, 0, 0)
    cubes.add_cube(cube1)
    cubes.add_cube(cube2)
    moves = Moves()
    moves.add_move(Move(0, 1, 1, 1))
    moves.add_move(Move(1, 1, 1, 1))
    cubes.apply_moves(moves)
    assert cubes.get_cube(0) == Cube(0, 1, 1, 1)
    assert cubes.get_cube(1) == Cube(1, 1, 1, 1)


def test_apply_affects_correct_cube():
    cubes = Cubes()
    cube1 = Cube(0, 0, 0, 0)
    cube2 = Cube(1, 0, 0, 0)
    cubes.add_cube(cube1)
    cubes.add_cube(cube2)
    moves = Moves()
    moves.add_move(Move(0, 1, 1, 1))
    cubes.apply_moves(moves)
    assert cubes.get_cube(0) == Cube(0, 1, 1, 1)
    assert cubes.get_cube(1) == Cube(1, 0, 0, 0)


def test_move_cube_id_invalid():
    cubes = Cubes()
    cube = Cube(0, 0, 0, 0)
    cubes.add_cube(cube)
    moves = Moves()
    moves.add_move(Move(1, 1, 1, 1))
    with pytest.raises(CubeNotFoundError):
        cubes.apply_moves(moves)
