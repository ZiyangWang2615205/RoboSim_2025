import random

from algorithm_client.cubes import Cube, Cubes
from algorithm_client.moves import Move, Moves
from algorithm_client.validator import is_valid_box, is_valid_move


# Validator should return False when the place is already occupied
def test_box_occupied():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 0, 1, 0))
    new_cube = Cube(2, 0, 1, 0)
    assert not is_valid_box(new_cube, cubes, 2, 2, 2)


# Validator should return False when the place is out of boundary
def test_box_boundary():
    result = is_valid_box(Cube(1, 0, 3, 0), Cubes(), 4, 4, 4)
    assert not result


# Validator should return False when the box is already exist
def test_box_exists():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 1, 0, 0))
    result = is_valid_box(Cube(1, 2, 0, 0), cubes, 4, 4, 4)
    assert not result


# Validator should return False when there is no box under new box and height of new box > 1
def test_box_attainablity():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 1, 0, 0))
    assert not is_valid_box(Cube(3, 0, 1, 0), cubes, 4, 4, 4)
    assert is_valid_box(Cube(4, 1, 1, 0), cubes, 4, 4, 4)


# ----------------------------------------------------------------------


# Validator should return False when user try to move cube that not in cubes
def test_move_id():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 0, 0, 0))
    assert not is_valid_move(Move(2, 0, 1, 0), cubes, 2, 2, 2)
    assert is_valid_move(Move(1, 0, 0, 1), cubes, 2, 2, 2)


# Validator should return False when user try to move cube without unit length of move
def test_one_unit_move():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 0, 0, 0))
    assert not is_valid_move(Move(1, 2, 0, 0), cubes, 6, 6, 6)
    assert not is_valid_move(Move(1, 0, 0, 3), cubes, 6, 6, 6)
    assert not is_valid_move(Move(1, 0, 0, -3), cubes, 6, 6, 6)


# Validator should return False when user try to move cube in diagonal direction
def test_diagonal():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 0, 0, 0))
    assert not is_valid_move(Move(1, 1, 1, 0), cubes, 4, 4, 4)
    assert not is_valid_move(Move(1, 1, 1, 1), cubes, 4, 4, 4)
    assert is_valid_move(Move(1, 1, 0, 0), cubes, 4, 4, 4)


# Validator should return false if the box is moving underground
def test_moving_underground():
    moves = Moves([])
    moves.add_move(Move(4, 0, -1, 0))
    moves.add_move(Move(5, 0, -1, 0))
    moves.add_move(Move(7, 0, -1, 0))
    cubes = Cubes()
    cube1 = Cube(4, random.randint(1, 4), 0, random.randint(1, 4))
    cube2 = Cube(5, random.randint(-2, 0), 0, random.randint(-2, 0))
    cube3 = Cube(7, random.randint(-4, -3), 0, random.randint(-4, -3))
    cubes.add_cube(cube1)
    cubes.add_cube(cube2)
    cubes.add_cube(cube3)
    for move in moves:
        assert not is_valid_move(move, cubes, 10, 10, 10)


# Validator should return true if the move is valid
def test_valid_move():
    moves = Moves([])
    for _ in range(1000):
        moves.add_move(Move(4, random.choice([-1, 1]), 0, 0))
        moves.add_move(Move(4, 0, 0, random.choice([-1, 1])))

    cubes = Cubes()
    cube = Cube(4, 5, 0, 5)
    cubes.add_cube(cube)
    for move in moves:
        assert is_valid_move(move, cubes, 10, 10, 10)


# Validator should return true if the box is climbing onto another box
def test_valid_climb():
    moves = Moves([])
    moves.add_move(Move(1, 1, 1, 0))
    moves.add_move(Move(1, -1, 1, 0))
    moves.add_move(Move(1, 0, 1, 1))
    moves.add_move(Move(1, 0, 1, -1))
    cubes = Cubes()
    cube1 = Cube(1, 5, 0, 5)
    cube2 = Cube(2, 4, 0, 5)
    cube3 = Cube(3, 6, 0, 5)
    cube4 = Cube(4, 5, 0, 4)
    cube5 = Cube(5, 5, 0, 6)
    cubes.add_cube(cube1)
    cubes.add_cube(cube2)
    cubes.add_cube(cube3)
    cubes.add_cube(cube4)
    cubes.add_cube(cube5)
    for move in moves:
        assert is_valid_move(move, cubes, 10, 10, 10)


# Validator return true if cube moves down
def test_obstacle():
    cubes = Cubes()
    cubes.add_cube(Cube(1, 0, 0, 0))
    cubes.add_cube(Cube(2, 0, 1, 0))
    cubes.add_cube(Cube(3, 0, 2, 0))
    cubes.add_cube(Cube(4, 1, 0, 0))
    assert is_valid_move(Move(3, 1, -1, 0), cubes, 6, 6, 6)
    cubes.add_cube(Cube(5, 1, 1, 0))
    assert not is_valid_move(Move(3, 1, -1, 0), cubes, 6, 6, 6)


# Validator should return false if there is a box on top of the start position
def test_box_on_top():
    move = Move(4, 1, 0, 0)
    cubes = Cubes()
    cube1 = Cube(4, 0, 0, 0)
    cube2 = Cube(9, 0, 1, 0)
    cubes.add_cube(cube1)
    cubes.add_cube(cube2)
    assert not is_valid_move(move, cubes, 10, 10, 10)
