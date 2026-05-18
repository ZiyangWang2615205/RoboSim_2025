import random

from algorithm_client.cubes import Cube, Cubes
from algorithm_client.moves import Move, Moves
from algorithm_client.validator import is_valid_move_set


def test_id_not_exist():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 0, 0, 0))
    cubes.add_cube(Cube(1, 0, 0, 1))
    moves = Moves([])
    moves.add_move(Move(2, 1, 0, 0))
    moves.add_move(Move(0, 1, 0, 0))
    assert not is_valid_move_set(moves, cubes, 20, 20, 20)


def test_valid_move_set():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 0, 0, 0))
    cubes.add_cube(Cube(1, 3, 0, 0))
    cubes.add_cube(Cube(2, 0, 0, 3))
    move_sets = []
    for _ in range(10):
        moves = Moves([])
        moves.add_move(Move(1, random.choice([-1, 1]), 0, 0))
        moves.add_move(Move(0, 0, 0, 1))
        moves.add_move(Move(2, 0, 0, random.choice([-1, 1])))
        move_sets.append(moves)
    for move_set in move_sets:
        assert is_valid_move_set(move_set, cubes, 20, 20, 20)


def test_move_params_invalid():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 0, 0, 0))
    cubes.add_cube(Cube(1, 3, 0, 0))
    cubes.add_cube(Cube(2, 0, 0, 3))
    move_sets = []
    for _ in range(10):
        moves = Moves([])
        moves.add_move(Move(1, random.choice([-1, 1]), 0, random.choice([-1, 1])))
        moves.add_move(Move(2, 0, 0, random.choice([-1, 1])))
        move_sets.append(moves)
    for move_set in move_sets:
        assert not is_valid_move_set(move_set, cubes, 20, 20, 20)


def test_cube_cannot_move():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 1, 0, 0))
    cubes.add_cube(Cube(1, 1, 1, 0))
    cubes.add_cube(Cube(2, 0, 0, 3))
    move_sets = []
    for _ in range(10):
        moves = Moves([])
        moves.add_move(Move(0, random.choice([-1, 1]), 0, 0))
        moves.add_move(Move(2, 0, 0, random.choice([-1, 1])))
        move_sets.append(moves)
    for move_set in move_sets:
        assert not is_valid_move_set(move_set, cubes, 20, 20, 20)


def test_cube_underground_or_unsupported():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 1, 0, 0))
    cubes.add_cube(Cube(1, 4, 0, 0))
    cubes.add_cube(Cube(2, 0, 0, 3))
    cubes.add_cube(Cube(3, 1, 1, 0))
    move_sets = []
    for _ in range(10):
        moves = Moves([])
        moves.add_move(Move(2, random.choice([-1, 1]), random.choice([-1, 1]), 0))
        move_sets.append(moves)
    for move_set in move_sets:
        assert not is_valid_move_set(move_set, cubes, 20, 20, 20)

    move_sets = []
    for _ in range(10):
        moves = Moves([])
        moves.add_move(Move(3, random.choice([-1, 1]), 0, 0))
        move_sets.append(moves)
    for move_set in move_sets:
        assert not is_valid_move_set(move_set, cubes, 20, 20, 20)


def test_cube_move_to_same_place():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 1, 0, 0))
    cubes.add_cube(Cube(1, 2, 0, 0))
    moves = Moves([])
    moves.add_move(Move(0, 1, 0, 0))
    moves.add_move(Move(1, 1, 0, 0))
    assert is_valid_move_set(moves, cubes, 20, 20, 20)
    cubes.add_cube(Cube(2, 3, 0, 0))
    moves = Moves([])
    moves.add_move(Move(0, 1, 0, 0))
    moves.add_move(Move(2, -1, 0, 0))
    assert not is_valid_move_set(moves, cubes, 20, 20, 20)


def test_collision_move():
    cubes = Cubes()
    cubes.add_cube(Cube(0, 1, 0, 0))
    cubes.add_cube(Cube(1, 2, 0, 0))
    moves = Moves([])
    moves.add_move(Move(0, 1, 0, 0))
    moves.add_move(Move(1, -1, 0, 0))
    assert not is_valid_move_set(moves, cubes, 20, 20, 20)


def test_collision_moves():
    cubes = Cubes(
        [
            Cube(1, 1, 0, 1),
            Cube(2, 1, 0, 0),
            Cube(3, 0, 0, 1),
        ]
    )
    moves = Moves(
        [
            Move(1, 1, 0, 0),  # Cube 1 moves from (1, 0, 1) to (2, 0, 1)
            Move(2, 0, 0, 1),  # Cube 2 moves from (1, 0, 0) to (1, 0, 1)
            Move(3, 1, 0, 0),  # Cube 3 moves from (0, 0, 1) to (1, 0, 1), a collision.
        ]
    )
    assert not is_valid_move_set(moves, cubes, 20, 20, 20)
