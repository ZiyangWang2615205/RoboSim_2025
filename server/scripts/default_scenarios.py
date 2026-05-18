from algorithm_client.generate_scenario import generate_scenario


def main():
    scenario = generate_scenario(
        width=4, height=4, depth=4, no_of_boxes_to_move=1, name="Scenario 1"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=4, height=4, depth=4, no_of_boxes_to_move=1, name="Scenario 2"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=7, height=7, depth=7, no_of_boxes_to_move=1, name="Scenario 3"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=10, height=10, depth=10, no_of_boxes_to_move=1, name="Scenario 4"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=15, height=15, depth=15, no_of_boxes_to_move=1, name="Scenario 5"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=20, height=20, depth=20, no_of_boxes_to_move=1, name="Scenario 6"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=30, height=30, depth=30, no_of_boxes_to_move=1, name="Scenario 7"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=20, height=20, depth=20, no_of_boxes_to_move=2, name="Scenario 8"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=30, height=30, depth=30, no_of_boxes_to_move=3, name="Scenario 9"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=40, height=40, depth=40, no_of_boxes_to_move=5, name="Scenario 10"
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=4,
        height=4,
        depth=4,
        no_of_boxes_to_move=1,
        name="Scenario 11",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=4,
        height=4,
        depth=4,
        no_of_boxes_to_move=1,
        name="Scenario 12",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=7,
        height=7,
        depth=7,
        no_of_boxes_to_move=1,
        name="Scenario 13",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=10,
        height=10,
        depth=10,
        no_of_boxes_to_move=1,
        name="Scenario 14",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=15,
        height=15,
        depth=15,
        no_of_boxes_to_move=1,
        name="Scenario 15",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=20,
        height=20,
        depth=20,
        no_of_boxes_to_move=1,
        name="Scenario 16",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=30,
        height=30,
        depth=30,
        no_of_boxes_to_move=1,
        name="Scenario 17",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=20,
        height=20,
        depth=20,
        no_of_boxes_to_move=2,
        name="Scenario 18",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=30,
        height=30,
        depth=30,
        no_of_boxes_to_move=3,
        name="Scenario 19",
        box_type=2,
    )

    scenario.to_file()

    scenario = generate_scenario(
        width=40,
        height=40,
        depth=40,
        no_of_boxes_to_move=5,
        name="Scenario 20",
        box_type=2,
    )

    scenario.to_file()


if __name__ == "__main__":
    main()
