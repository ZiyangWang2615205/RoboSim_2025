import { describe } from "mocha";
import { BoxType, Cube, Scenario, ExitZone } from "../types/index";
import { State, MoveError, ScenarioError } from "../model/grid";
import { assert } from "chai";

function createScenario({
    cubes = [{ id: 1, x: 0, y: 0, z: 0 }],
    size = 10,
    type = BoxType.Type1,
    exit =  {x1: 0, x2:0, y1:0, y2:0, z1:0, z2:0},
}: {
    cubes?: Cube[];
    size?: number;
    type?: BoxType;
    exit?: ExitZone;
} = {}): Scenario {
    return {
        id: 1,
        name: "",
        width: size,
        height: size,
        depth: size,
        start: cubes,
        requirements: cubes,
        box_type: type,
        exit_zone: exit,
        zone_problem: false
    };
}

describe("Scenario validation", () => {
    it("should fail if a box is out of bounds", function () {
        const scenario = createScenario({
            cubes: [{ id: 1, x: 10, y: 0, z: 0 }],
            size: 10,
        });

        assert.throws(() => State.from_scenario(scenario), ScenarioError);

        const scenario2 = createScenario({
            cubes: [{ id: 1, x: 0, y: -1, z: 0 }],
            size: 10,
        });

        assert.throws(() => State.from_scenario(scenario2), ScenarioError);
    });

    it("should fail if there are two boxes with the same ID", function () {
        const scenario = createScenario({
            cubes: [
                { id: 1, x: 0, y: 0, z: 0 },
                { id: 1, x: 1, y: 0, z: 0 },
            ],
        });

        assert.throws(() => State.from_scenario(scenario), ScenarioError);
    });

    it("should fail if there are two boxes with the same position", function () {
        const scenario = createScenario({
            cubes: [
                { id: 1, x: 0, y: 0, z: 0 },
                { id: 2, x: 0, y: 0, z: 0 },
            ],
        });

        assert.throws(() => State.from_scenario(scenario), ScenarioError);
    });

    it("should fail if there are floating boxes", () => {
        const scenario = createScenario({
            cubes: [{ id: 1, x: 0, y: 1, z: 0 }],
        });

        assert.throws(() => State.from_scenario(scenario), ScenarioError);

        const scenario2 = createScenario({
            cubes: [
                { id: 1, x: 0, y: 0, z: 0 },
                { id: 2, x: 0, y: 2, z: 0 },
            ],
        });

        assert.throws(() => State.from_scenario(scenario2), ScenarioError);
    });
});

describe("Single move validation (Type 1)", () => {
    it("should fail if the box does not exist", () => {
        const grid = State.from_scenario(createScenario());

        assert.throws(
            () => grid.apply_move({ id: 2, dx: 0, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if deltaX and deltaZ are both 0", () => {
        const grid = State.from_scenario(createScenario());

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 1, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if the box is moving more than one space at a time", () => {
        const grid = State.from_scenario(createScenario());

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 2, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 2, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 2 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 2, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -2, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: -2, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: -2 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: -2, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if deltaX, deltaY, and deltaZ are all 1 or -1", () => {
        const grid = State.from_scenario(createScenario());

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 1, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: -1, dz: -1 }),
            MoveError,
        );
    });

    it("should not allow diagonal moves", () => {
        const grid = State.from_scenario(createScenario());

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 1, dz: -1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: -1, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: 0, dz: -1 }),
            MoveError,
        );
    });

    it("should fail if the box moves to an unsupported location", () => {
        // Make sure all moves are invalid
        const cubes: Cube[] = [
            { id: 4, x: 0, y: 2, z: 2 },
            { id: 5, x: 0, y: 1, z: 2 },
            { id: 6, x: 0, y: 0, z: 2 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        // Test four directions when box is moving down
        assert.throws(
            () => grid.apply_move({ id: 4, dx: 0, dy: -1, dz: -1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 4, dx: -1, dy: -1, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 4, dx: 0, dy: -1, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 4, dx: 1, dy: -1, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if the end position is outside the bounds of the warehouse", () => {
        const cubes: Cube[] = [
            { id: 4, x: 9, y: 0, z: 5 },
            { id: 5, x: 0, y: 0, z: 5 },
            { id: 7, x: 5, y: 0, z: 9 },
            { id: 8, x: 5, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.throws(
            () => grid.apply_move({ id: 4, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 5, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 7, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 8, dx: 0, dy: 0, dz: -1 }),
            MoveError,
        );
    });

    it("should fail if the box is moving underground", () => {
        const cubes: Cube[] = [
            { id: 1, x: 1, y: 0, z: 1 },
            { id: 4, x: 0, y: 0, z: 0 },
            { id: 5, x: 2, y: 0, z: 2 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: -1, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 4, dx: 1, dy: -1, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 5, dx: 0, dy: -1, dz: 1 }),
            MoveError,
        );
    });

    it("should not fail if the move is valid", () => {
        const grid = State.from_scenario(createScenario());

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
    });

    it("should not fail if the box is climbing onto another box", () => {
        // Make a cube surrounded cubes so it can climb in all directions
        const cubes: Cube[] = [
            { id: 1, x: 3, y: 0, z: 3 },
            { id: 2, x: 2, y: 0, z: 3 },
            { id: 3, x: 4, y: 0, z: 3 },
            { id: 4, x: 3, y: 0, z: 2 },
            { id: 5, x: 3, y: 0, z: 4 },
        ];

        let grid = State.from_scenario(createScenario({ cubes }));
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 1, dz: 0 }),
        );

        grid = State.from_scenario(createScenario({ cubes }));
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: -1, dy: 1, dz: 0 }),
        );

        grid = State.from_scenario(createScenario({ cubes }));
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 0, dy: 1, dz: 1 }),
        );

        grid = State.from_scenario(createScenario({ cubes }));
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 0, dy: 1, dz: -1 }),
        );
    });

    it("should fail if the box has a box above it", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });
});

describe("Single move validation (Type 2)", () => {
    it("should fail if the box does not exist", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 2, dx: 0, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should only allow boxes to move in one direction", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 0 }),
            MoveError,
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: 0, dz: 1 }),
            MoveError,
        );
    });

    it("should fail if the box is moving more than one space at a time", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 2, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 2, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: -2 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: -2, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow vertical moves", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 1, dz: 0 }),
            MoveError,
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 1, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if the box moves to an unsupported location", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 2, z: 2 },
            { id: 2, x: 0, y: 1, z: 2 },
            { id: 3, x: 0, y: 0, z: 2 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        // Test four directions when box is moving down
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: -1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should fail if the end position is outside the bounds of the warehouse", () => {
        const cubes: Cube[] = [
            { id: 4, x: 9, y: 0, z: 5 },
            { id: 5, x: 0, y: 0, z: 5 },
            { id: 7, x: 5, y: 0, z: 9 },
            { id: 8, x: 5, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 4, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 5, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 7, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 8, dx: 0, dy: 0, dz: -1 }),
            MoveError,
        );
    });
    it("should not fail if the move is valid", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
    });

    it("should fail if the box has a box above it", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });
});

describe("Leg displacement and extension validation", () => {
    it("should allow boxes to extend their legs", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() => grid.displace_legs(1));
        assert.doesNotThrow(() => grid.extend_legs(1));

        const second_grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() => second_grid.displace_legs(2));
        assert.doesNotThrow(() => second_grid.extend_legs(2));
    });

    it("does not allow boxes to extend their legs before they have been displacen", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(() => grid.extend_legs(1), MoveError);
    });

    it("should only allow Type 2 boxes to displace or extend their legs", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type1 }),
        );

        assert.throws(() => grid.displace_legs(1), MoveError);
        assert.throws(() => grid.extend_legs(1), MoveError);
    });

    it("should fail if the box is too high to reach the ground", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        assert.throws(() => grid.extend_legs(3), MoveError);
    });

    it("should fail if the stack is full", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, size: 2, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        assert.throws(() => grid.extend_legs(1), MoveError);
    });
});

describe("Multiple move validation (Type 1)", () => {
    it("should allow multiple valid moves", () => {
        const cubes: Cube[] = [
            { id: 0, x: 0, y: 0, z: 0 },
            { id: 1, x: 3, y: 0, z: 0 },
            { id: 2, x: 0, y: 0, z: 3 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 2, dx: 0, dy: 0, dz: 1 }),
        );
    });

    it("should fail if the box is moving", () => {
        const cubes: Cube[] = [{ id: 0, x: 0, y: 0, z: 0 }];

        const grid = State.from_scenario(createScenario({ cubes }));

        grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 });

        assert.throws(
            () => grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow two moves to the same place", () => {
        const cubes: Cube[] = [
            { id: 1, x: 1, y: 0, z: 0 },
            { id: 2, x: 0, y: 0, z: 1 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: -1, dy: 0, dz: 0 }),
        );
        assert.throws(
            () => grid.apply_move({ id: 2, dx: 0, dy: 0, dz: -1 }),
            MoveError,
        );
    });

    it("should not allow a box to move on top of a moving box", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
            { id: 3, x: 0, y: 0, z: 2 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 2, dx: 1, dy: 0, dz: 0 }),
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: 1, dy: 1, dz: 0 }),
            MoveError,
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 3, dx: 0, dy: 0, dz: -1 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 1, dz: 1 }),
            MoveError,
        );
    });

    it("should not allow abox to move with a moving box above it", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        const move = { id: 2, dx: 1, dy: -1, dz: 0 };

        grid.apply_move(move);

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );

        grid.finish_move(move);

        grid.apply_move({ id: 2, dx: -1, dy: 1, dz: 0 });

        assert.throws(
            () => grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );
    });

    it("should allow a box to move into a space which another box is moving out of", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 2, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
    });

    it("should not allow two opposite moves", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(createScenario({ cubes }));

        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
        assert.throws(
            () => grid.apply_move({ id: 1, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should finish moves correctly", () => {
        const grid = State.from_scenario(createScenario());

        const first_move = { id: 1, dx: 1, dy: 0, dz: 0 };
        grid.apply_move(first_move);

        grid.finish_move(first_move);

        const second_move = { id: 1, dx: -1, dy: 0, dz: 0 };

        assert.doesNotThrow(() => {
            grid.apply_move(second_move);
            grid.finish_move(second_move);
        });
    });
});

describe("Multiple move validation (Type 2)", () => {
    it("should allow multiple valid moves", () => {
        const cubes: Cube[] = [
            { id: 0, x: 0, y: 0, z: 0 },
            { id: 1, x: 3, y: 0, z: 0 },
            { id: 2, x: 0, y: 0, z: 3 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 2, dx: 0, dy: 0, dz: 1 }),
        );
    });

    it("should fail if the box is moving", () => {
        const cubes: Cube[] = [{ id: 0, x: 0, y: 0, z: 0 }];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 });

        assert.throws(
            () => grid.apply_move({ id: 0, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow two moves to the same place", () => {
        const cubes: Cube[] = [
            { id: 1, x: 1, y: 0, z: 0 },
            { id: 2, x: 0, y: 0, z: 1 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: -1, dy: 0, dz: 0 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 2, dx: 0, dy: 0, dz: -1 }),
            MoveError,
        );
    });

    it("should not allow a box to move on top of a moving box", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
            { id: 3, x: 1, y: 1, z: 0 },
            { id: 4, x: 2, y: 0, z: 1 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 0, dy: 0, dz: 1 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 2, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 4, dx: 0, dy: 0, dz: -1 }),
        );

        assert.throws(
            () => grid.apply_move({ id: 2, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow a box to move with a moving box above it", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 0, z: 1 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        const move = { id: 2, dx: 0, dy: 0, dz: 1 };
        const second_move = { id: 1, dx: 1, dy: 0, dz: 0 };

        grid.apply_move(move);

        assert.throws(() => grid.apply_move(second_move), MoveError);

        grid.finish_move(move);

        assert.doesNotThrow(() => grid.apply_move(second_move));
    });

    it("should allow a box to move into a space which another box is moving out of", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 2, dx: 1, dy: 0, dz: 0 }),
        );
        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
    });

    it("should finish moves correctly", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        const first_move = { id: 1, dx: 1, dy: 0, dz: 0 };
        grid.apply_move(first_move);

        grid.finish_move(first_move);

        const second_move = { id: 1, dx: -1, dy: 0, dz: 0 };

        assert.doesNotThrow(() => {
            grid.apply_move(second_move);
            grid.finish_move(second_move);
        });
    });

    it("should allow a box to move under another box with its legs extended", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 }),
        );
    });

    it("should not allow a box to move out from underneath a box until it has extended its legs", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);

        const move = { id: 1, dx: 1, dy: 0, dz: 0 };

        assert.throws(() => grid.apply_move(move), MoveError);

        grid.finish_extending_legs(2);

        assert.doesNotThrow(() => grid.apply_move(move));
    });

    it("should not allow cubes to move from a stack that is being pushed upwards", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 },
            { id: 4, x: 1, y: 0, z: 0 },
            { id: 5, x: 1, y: 1, z: 0 },
            { id: 6, x: 0, y: 0, z: 1 },
            { id: 7, x: 0, y: 1, z: 1 },
            { id: 8, x: 0, y: 2, z: 1 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);

        assert.throws(
            () => grid.apply_move({ id: 3, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );

        assert.throws(
            () => grid.apply_move({ id: 3, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );

        grid.finish_extending_legs(1);

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 3, dx: 0, dy: 0, dz: 1 }),
        );
    });

    it("does not allow a box to extend its legs multiple times", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);

        assert.throws(() => grid.extend_legs(1), MoveError);

        grid.finish_extending_legs(1);

        assert.throws(() => grid.extend_legs(1), MoveError);
    });

    it("should allow a box to retract its legs", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        assert.throws(() => grid.retract_legs(1), MoveError);

        grid.displace_legs(1);
        grid.extend_legs(1);

        assert.throws(() => grid.retract_legs(1), MoveError);

        grid.finish_extending_legs(1);

        grid.retract_legs(1);
    });

    it("does not allow a box to retract its legs multiple times", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);

        grid.finish_extending_legs(1);

        grid.retract_legs(1);

        assert.throws(() => grid.retract_legs(1), MoveError);

        grid.finish_retracting_legs(1);

        assert.throws(() => grid.retract_legs(1), MoveError);
    });

    it("should allow a box to retract its legs above the ground", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);
        grid.finish_extending_legs(2);

        assert.doesNotThrow(() => grid.retract_legs(2));
    });

    it("should not allow a box to move beneath a retracting box", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);
        grid.finish_extending_legs(1);

        grid.retract_legs(1);

        assert.throws(
            () => grid.apply_move({ id: 2, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow a box to move on top of a retracting box", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
            { id: 3, x: 1, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);
        grid.finish_extending_legs(1);

        grid.retract_legs(1);

        assert.throws(
            () => grid.apply_move({ id: 3, dx: -1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("should not allow a box to move from a stack that is moving downwards", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 },
            { id: 4, x: 1, y: 0, z: 0 },
            { id: 5, x: 1, y: 1, z: 0 },
            { id: 6, x: 1, y: 2, z: 0 },
            { id: 7, x: 0, y: 0, z: 1 },
            { id: 8, x: 0, y: 1, z: 1 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);
        grid.finish_extending_legs(1);

        grid.retract_legs(1);

        assert.throws(
            () => grid.apply_move({ id: 3, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );

        assert.throws(
            () => grid.apply_move({ id: 3, dx: 0, dy: 0, dz: 1 }),
            MoveError,
        );

        grid.finish_retracting_legs(1);

        assert.doesNotThrow(() =>
            grid.apply_move({ id: 3, dx: 0, dy: 0, dz: 1 }),
        );
    });

    it("should not allow a box to move unless its legs are withdrawn", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        const move = {
            id: 1,
            dx: 1,
            dy: 0,
            dz: 0,
        };

        grid.displace_legs(1);

        assert.throws(() => grid.apply_move(move), MoveError);

        grid.withdraw_legs(1);

        assert.doesNotThrow(() => grid.apply_move(move));
    });

    it("should not allow a moving box to move its legs", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 }),
        );

        const move = {
            id: 1,
            dx: 1,
            dy: 0,
            dz: 0,
        };

        grid.apply_move(move);

        assert.throws(() => grid.displace_legs(1), MoveError);

        grid.finish_move(move);

        assert.doesNotThrow(() => grid.displace_legs(1));
    });

    it("pushes a box up if it extends its legs above a box with displaced legs", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 1, y: 0, z: 0 },
            { id: 4, x: 1, y: 1, z: 0 },
            { id: 5, x: 1, y: 2, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);

        const move = { id: 5, dx: -1, dy: 0, dz: 0 };

        assert.doesNotThrow(() => grid.apply_move(move));

        grid.finish_move(move);

        grid.finish_extending_legs(2);

        grid.retract_legs(2);
        grid.finish_retracting_legs(2);

        grid.displace_legs(1);
        grid.extend_legs(2);

        const second_move = { id: 4, dx: -1, dy: 0, dz: 0 };

        assert.doesNotThrow(() => grid.apply_move(second_move));

        grid.finish_extending_legs(2);

        grid.finish_move(second_move);
    });

    it("moves a box down if it retracts its legs without a box below it", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 },
            { id: 4, x: 1, y: 0, z: 0 },
            { id: 5, x: 1, y: 1, z: 0 },
            { id: 6, x: 1, y: 2, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);

        grid.finish_extending_legs(2);

        grid.retract_legs(2);
        grid.finish_retracting_legs(2);

        const move = { id: 6, dx: -1, dy: 0, dz: 0 };
        assert.throws(() => grid.apply_move(move), MoveError);

        grid.extend_legs(2);
        grid.finish_extending_legs(2);

        const second_move = { id: 1, dx: 0, dy: 0, dz: 1 };
        grid.apply_move(second_move);
        assert.throws(() => grid.retract_legs(2), MoveError);

        grid.finish_move(second_move);

        grid.retract_legs(2);

        assert.throws(() => grid.retract_legs(2), MoveError);

        grid.finish_retracting_legs(2);

        assert.doesNotThrow(() => grid.apply_move(move));
    });

    it("does not allow a box to withdraw its legs if it would leave a box above unsupported", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 1, y: 0, z: 0 },
            { id: 4, x: 1, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.displace_legs(2);

        grid.extend_legs(2);

        assert.throws(() => grid.withdraw_legs(1), MoveError);

        grid.finish_extending_legs(2);

        assert.throws(() => grid.withdraw_legs(1), MoveError);

        grid.retract_legs(2);

        assert.throws(() => grid.withdraw_legs(1), MoveError);

        grid.finish_retracting_legs(2);

        assert.doesNotThrow(() => grid.withdraw_legs(1));

        grid.displace_legs(1);

        grid.extend_legs(2);

        const move = { id: 4, dx: -1, dy: 0, dz: 0 };

        grid.apply_move(move);

        assert.throws(() => grid.withdraw_legs(1), MoveError);

        grid.finish_extending_legs(2);

        assert.throws(() => grid.withdraw_legs(1), MoveError);

        grid.finish_move(move);

        assert.doesNotThrow(() => grid.withdraw_legs(1));

        assert.throws(
            () => grid.apply_move({ id: 4, dx: 1, dy: 0, dz: 0 }),
            MoveError,
        );
    });

    it("does not allow a box to move out from underneath a box with unsupported legs", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 },
            { id: 4, x: 1, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(3);
        grid.extend_legs(3);

        const move = { id: 2, dx: 1, dy: 0, dz: 0 };
        assert.throws(() => grid.apply_move(move), MoveError);

        grid.finish_extending_legs(3);

        assert.throws(() => grid.apply_move(move), MoveError);

        grid.displace_legs(1);

        assert.doesNotThrow(() => grid.apply_move(move));
    });

    it("should not allow a box to withdraw its legs if the box above has not retracted its legs", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(2);
        grid.extend_legs(2);

        assert.throws(() => grid.displace_legs(1), MoveError);

        grid.finish_extending_legs(2);

        assert.throws(() => grid.displace_legs(1), MoveError);

        grid.retract_legs(2);

        assert.throws(() => grid.displace_legs(1), MoveError);

        grid.finish_retracting_legs(2);

        assert.doesNotThrow(() => grid.displace_legs(1));
        assert.doesNotThrow(() => grid.extend_legs(1));
    });

    it("should allow boxes to stack themselves", () => {
        // Tests that using this box type in its "intended" way works.
        // We take 3 boxes in a line and turn them into a stack, then turn
        // them back into a line again.
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 1, y: 0, z: 0 },
            { id: 3, x: 2, y: 0, z: 0 },
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 }),
        );

        grid.displace_legs(1);
        grid.extend_legs(1);

        let move = { id: 2, dx: -1, dy: 0, dz: 0 };

        grid.apply_move(move);

        grid.finish_extending_legs(1);

        grid.finish_move(move);

        move = { id: 3, dx: -1, dy: 0, dz: 0 };

        grid.apply_move(move);
        grid.finish_move(move);

        grid.retract_legs(1);
        grid.finish_retracting_legs(1);

        grid.displace_legs(2);
        grid.extend_legs(2);
        grid.finish_extending_legs(2);

        grid.apply_move(move);
        grid.finish_move(move);

        grid.retract_legs(2);
        grid.finish_retracting_legs(2);

        grid.displace_legs(3);

        // Now to unstack
        grid.withdraw_legs(3);

        grid.extend_legs(2);
        grid.finish_extending_legs(2);

        move = { id: 3, dx: 1, dy: 0, dz: 0 };

        grid.apply_move(move);
        grid.finish_move(move);
        grid.apply_move(move);
        grid.finish_move(move);

        grid.retract_legs(2);
        grid.finish_retracting_legs(2);

        grid.withdraw_legs(2);

        grid.extend_legs(1);
        grid.finish_extending_legs(1);

        move = { id: 2, dx: 1, dy: 0, dz: 0 };

        grid.apply_move(move);
        grid.finish_move(move);

        grid.retract_legs(1);
        grid.finish_retracting_legs(1);

        grid.withdraw_legs(1);

        assert.sameDeepMembers(
            grid
                .get_cubes()
                .map(({ legs_extended, legs_displaced, ...cube }) => cube),
            cubes,
        );
    });
});

 describe("Energy usage calculations", () => {
    it("should charge 1 energy for type 1 horizontal move", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type1 })
        );

        grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 });

        assert.equal(grid.get_energy_used(), 1);
    });

    it("should charge 1 energy for a type 2 horizontal move", () => {
        const grid = State.from_scenario(
            createScenario({ type: BoxType.Type2 })
        );

        // moving type 2 horizontally
        grid.apply_move({ id: 1, dx: 1, dy: 0, dz: 0 });

        assert.equal(grid.get_energy_used(), 1);
    });

    it("should charge 2 energy for a type 1 vertical move", () => {
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 }, // moving box
            { id: 2, x: 1, y: 0, z: 0 }, // other box
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type1 })
        );

        grid.apply_move({ id: 1, dx: 1, dy: 1, dz: 0 });

        // energy = up + box also moves to the right = 3
        assert.equal(grid.get_energy_used(), 3);
    });

    it("should charge stack height for type 2 vertical move", () => {
        // creating stack of 3 boxes
        const cubes: Cube[] = [
            { id: 1, x: 0, y: 0, z: 0 },
            { id: 2, x: 0, y: 1, z: 0 },
            { id: 3, x: 0, y: 2, z: 0 }, 
        ];

        const grid = State.from_scenario(
            createScenario({ cubes, type: BoxType.Type2 })
        );

        // lifting bottom box to lift all 3
        grid.displace_legs(1);
        grid.extend_legs(1);

        // energy cost = boxes stacked ontop + the lifting box itself
        assert.equal(grid.get_energy_used(), 3);
    });
});
