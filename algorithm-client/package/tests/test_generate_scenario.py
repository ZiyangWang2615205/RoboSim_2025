from typing import TYPE_CHECKING

from algorithm_client.generate_scenario import generate_scenario

if TYPE_CHECKING:
    from algorithm_client.scenario import Scenario


def test_scenario_name():
    name: str = "test_scenario"
    scenario: Scenario = generate_scenario(name=name)
    assert scenario.name == name + " - Type 1"


def test_dimensions():
    width: int = 8
    height: int = 8
    depth: int = 8
    scenario: Scenario = generate_scenario(width, height, depth)
    assert scenario.width == width
    assert scenario.height == height
    assert scenario.depth == depth


def test_valid_no_of_boxes():
    scenario: Scenario = generate_scenario()
    volume: int = scenario.width * scenario.height * scenario.depth
    no_of_boxes: int = len(scenario.start.to_json())
    assert (volume // 10) <= no_of_boxes <= (volume // 5)


def test_valid_no_boxes_to_move_1():
    scenario: Scenario = generate_scenario(no_of_boxes_to_move=3)
    no_of_boxes_to_move: int = len(scenario.requirements.to_json())
    assert no_of_boxes_to_move == 3


def test_valid_no_boxes_to_move_2():
    scenario: Scenario = generate_scenario(no_of_boxes_to_move=-1)
    no_of_boxes: int = len(scenario.start.to_json())
    no_of_boxes_to_move: int = len(scenario.requirements.to_json())
    assert 1 <= no_of_boxes_to_move <= (no_of_boxes // 2)


def test_default_scenario():
    scenario: Scenario = generate_scenario()
    no_of_boxes: int = len(scenario.start.to_json())
    no_of_boxes_to_move: int = len(scenario.requirements.to_json())
    assert scenario.width == 7
    assert scenario.height == 7
    assert scenario.depth == 7
    assert 34 <= no_of_boxes <= 68
    assert 1 <= no_of_boxes_to_move <= (no_of_boxes // 2)
    assert scenario.name == "generated_scenario - Type 1"
