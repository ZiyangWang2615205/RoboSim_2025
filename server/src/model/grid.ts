import { Cube, CubeState, Move, Scenario, BoxType } from "../types/index.js";

// NOTE: The validation logic here is quite complicated! It may be useful to
// look at the tests (`grid.unit.spec.ts`) to see how it works.

/**
 * Represents the state of a warehouse.
 */
export class State {
    private width: number;
    private height: number;
    private depth: number;
    private box_type: BoxType;
    private grid: Grid;
    private energy_used:number;

    private constructor(
        width: number,
        height: number,
        depth: number,
        box_type: BoxType,
        grid: Grid,
    ) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.box_type = box_type;
        this.grid = grid;
        this.energy_used = 0;
    }

    /**
     * Create a new state from a scenario.
     *
     * @throws {ScenarioError} If the scenario is invalid.
     */
    static from_scenario(scenario: Scenario): State {
        const grid = ArrayGrid.from_scenario(scenario);

        return new State(
            scenario.width,
            scenario.height,
            scenario.depth,
            scenario.box_type,
            grid,
        );
    }

    /**
     * Get the current state of the cubes in the warehouse.
     */
    get_cubes(): CubeState[] {
        return this.grid.get_cubes();
    }

    /**
     * Get the total energy used so far in this state.
     */
    get_energy_used(): number {
        return this.energy_used;
    }

    /**
     * Validate and apply a move to the state. This puts the box into a
     * "pending" state: the box's position will stay the same until
     * `finish_move()` is called.
     *
     * @param move - The move to apply.
     *
     * @throws {MoveError} If the move is invalid.
     */
    apply_move(move: Move) {
        const position = this.grid.box_position(move.id);

        if (!position) {
            throw new MoveError("Box does not exist");
        }

        const possible_distances = [-1, 0, 1];

        // check the move range
        if (
            !possible_distances.includes(move.dx) ||
            !possible_distances.includes(move.dy) ||
            !possible_distances.includes(move.dz)
        ) {
            throw new MoveError("dx, dy and dz must be -1, 0 or 1");
        }

        if (this.box_type === BoxType.Type1) {
            if (move.dx === 0 && move.dz === 0) {
                throw new MoveError("Move cannot be horizontal");
            }

            if (Math.abs(move.dx) + Math.abs(move.dz) != 1) {
                throw new MoveError("Move cannot be diagonal");
            }
        } else if (this.box_type === BoxType.Type2) {
            const total_distance =
                Math.abs(move.dx) + Math.abs(move.dy) + Math.abs(move.dz);

            if (total_distance !== 1) {
                throw new MoveError("Move cannot be diagonal");
            }

            if (move.dy !== 0) {
                throw new MoveError("Move cannot be vertical");
            }
        } else {
            throw new Error("Unsupported box type");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            // `box_position()` should always return a valid position, so if
            // this happens the state is invalid.
            // Hence we throw a normal error instead of a `MoveError`.
            throw new Error("Box does not exist");
        }

        if (cell.type !== CellType.Stationary) {
            throw new MoveError("Box is already moving");
        }

        const new_position = {
            x: position.x + move.dx,
            y: position.y + move.dy,
            z: position.z + move.dz,
        };

        if (
            new_position.x < 0 ||
            new_position.x >= this.width ||
            new_position.y < 0 ||
            new_position.y >= this.height ||
            new_position.z < 0 ||
            new_position.z >= this.depth
        ) {
            throw new MoveError("Move is out of bounds");
        }

        if (this.box_type === BoxType.Type1) {
            if (position.y != this.stack_height(position.x, position.z) - 1) {
                // The top box is not the box we want to move.
                throw new MoveError(
                    "Box cannot move if there is another box above it",
                );
            }

            // if vertical displacement then energy used for type1 costs 2
            if (move.dy != 0) {
                this.energy_used += 2;
            }

            this.apply_horizontal_move(position, new_position);
        } else {
            if (cell.legs !== LegsState.Withdrawn) {
                throw new MoveError("Cannot move if legs are not withdrawn");
            }

            const position_above = {
                x: position.x,
                y: position.y + 1,
                z: position.z,
            };

            const cell_above = this.get_cell(position_above);

            if (cell_above !== null) {
                if (cell_above.legs === LegsState.Extended) {
                    if (position.y !== 0) {
                        const cell_below = this.get_cell({
                            x: position.x,
                            y: position.y - 1,
                            z: position.z,
                        });

                        // The legs must be supported by the cell below.
                        if (cell_below?.legs === LegsState.Withdrawn) {
                            throw new MoveError(
                                "Box cannot move if there is an unsupported box above it",
                            );
                        }
                    }
                } else {
                    throw new MoveError(
                        "Box cannot move if there is an unsupported box above it",
                    );
                }
            }

            this.apply_horizontal_move(position, new_position);
        }
    }

    /**
     * Finish a move's execution. This should be called after the move has been
     * applied to the state.
     */
    finish_move(move: Move) {
        const position = this.grid.box_position(move.id);

        if (!position) {
            throw new Error("Box does not exist");
        }

        const original_position = {
            x: position.x - move.dx,
            y: position.y - move.dy,
            z: position.z - move.dz,
        };

        this.finish_single_move(original_position, position);
    }

    /**
     * Extend the legs of a box. This can only be done if the box is a Type 2
     * box, and its legs are displaced. This puts the box into a "pending"
     * state; call `finish_extending_legs()` to complete the action.
     *
     * @param id - The id of the box which should extend its legs.
     *
     * @throws {MoveError} If the box cannot extend its legs.
     */
    extend_legs(id: number) {
        if (this.box_type !== BoxType.Type2) {
            throw new MoveError("Box type must be Type2");
        }

        const position = this.grid.box_position(id);

        if (position === null) {
            throw new MoveError("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            // internal error, since the position should point to a valid cell
            throw new Error("Box does not exist");
        }

        if (cell.type !== CellType.Stationary) {
            throw new MoveError("Box must be stationary");
        }

        if (cell.legs !== LegsState.Displaced) {
            if (cell.legs === LegsState.Withdrawn) {
                throw new MoveError(
                    "Legs must be displaced before they can be extended",
                );
            } else {
                throw new MoveError("Legs must be retracted");
            }
        }

        if (position.y === 0) {
            this.push_upwards(position, cell);
        } else {
            const position_below = {
                x: position.x,
                y: position.y - 1,
                z: position.z,
            };

            const cell_below = this.get_cell(position_below);

            if (cell_below?.legs === LegsState.Withdrawn) {
                cell.legs = LegsState.Extending;
            } else {
                this.push_upwards(position, cell);
            }
        }
    }

    /**
     * Finish extending the legs of a box. This should be called after
     * `extend_legs()`
     */
    finish_extending_legs(id: number) {
        const position = this.grid.box_position(id);

        if (position === null) {
            throw new Error("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            throw new Error("Box does not exist");
        }

        if (cell.type === CellType.Stationary) {
            cell.legs = LegsState.Extended;
        } else {
            cell.legs = LegsState.Extended;

            const original_y = position.y - 1;

            const stack_height = this.stack_height(position.x, position.z);

            // There is a `MovingTo` cell at the top of the stack, so we
            // start from the box below that (which is the box moving up to
            // the top position).
            const original_stack_height = stack_height - 1;

            for (let i = original_stack_height - 1; i >= original_y; i--) {
                const from = {
                    x: position.x,
                    y: i,
                    z: position.z,
                };

                const to = {
                    x: position.x,
                    y: i + 1,
                    z: position.z,
                };

                this.finish_single_move(from, to);
            }
        }
    }

    /**
     * Retract the legs of a box, moving them back up. This can only be done if
     * the box is a Type 2 box, and its legs are extended. This puts the box
     * into a "pending" state; call `finish_retracting_legs()` to complete the
     * action.
     *
     * @param id - The id of the box which should retract its legs.
     *
     * @throws {MoveError} If the box cannot retract its legs.
     */
    retract_legs(id: number) {
        if (this.box_type !== BoxType.Type2) {
            throw new MoveError("Box type must be Type2");
        }

        const position = this.grid.box_position(id);

        if (position === null) {
            throw new MoveError("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            // Internal error, since the position should point to a valid cell
            throw new Error("Box does not exist");
        }

        if (cell.type !== CellType.Stationary) {
            throw new MoveError("Box must be stationary");
        }

        if (cell.legs !== LegsState.Extended) {
            throw new MoveError("Legs must be extended");
        }

        if (position.y === 0) {
            cell.legs = LegsState.Retracting;
        } else {
            const position_below = {
                x: position.x,
                y: position.y - 1,
                z: position.z,
            };

            const cell_below = this.get_cell(position_below);

            if (cell_below === null) {
                const stack_height = this.stack_height(position.x, position.z);

                this.check_boxes_above(position);

                cell.legs = LegsState.Retracting;

                // energy used when type2 moves down = num of boxs ontop including box itself
                const box_num = stack_height - position.y;
                this.energy_used = box_num;

                // Move every box above the cell (including the cell itself) down a
                // unit
                for (let i = position.y; i < stack_height; i++) {
                    const from = {
                        x: position.x,
                        y: i,
                        z: position.z,
                    };

                    const to = {
                        x: position.x,
                        y: i - 1,
                        z: position.z,
                    };

                    this.start_single_move(from, to);
                }
            } else if (cell_below.type === CellType.Stationary) {
                cell.legs = LegsState.Retracting;
            } else {
                throw new MoveError(
                    "Cannot retract legs when there is a moving box below",
                );
            }
        }
    }

    /**
     * Finish retracting the legs of a box. This should be called after
     * `retract_legs()`
     */
    finish_retracting_legs(id: number) {
        const position = this.grid.box_position(id);

        if (position === null) {
            throw new Error("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            throw new Error("Box does not exist");
        }

        if (cell.type === CellType.Stationary) {
            cell.legs = LegsState.Displaced;
        } else {
            const original_y = position.y + 1;

            const stack_height = this.stack_height(position.x, position.z);

            cell.legs = LegsState.Displaced;

            for (let i = original_y; i < stack_height; i++) {
                const from = {
                    x: position.x,
                    y: i,
                    z: position.z,
                };

                const to = {
                    x: position.x,
                    y: i - 1,
                    z: position.z,
                };

                this.finish_single_move(from, to);
            }
        }
    }

    /**
     * Displace the legs of a box, moving them out from its body. This can only
     * be done if the box is a Type 2 box, and its legs are withdrawn. This
     * action is instantaneous, and does not have a pending state.
     *
     * @param id - The id of the box which should displace its legs.
     *
     * @throws {MoveError} If the box cannot displace its legs.
     */
    displace_legs(id: number) {
        if (this.box_type !== BoxType.Type2) {
            throw new MoveError("Box type must be Type2");
        }

        const position = this.grid.box_position(id);

        if (position === null) {
            throw new MoveError("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            throw new Error("Box not found");
        }

        if (cell.type !== CellType.Stationary) {
            throw new MoveError("Box must be stationary");
        }

        if (cell.legs !== LegsState.Withdrawn) {
            throw new MoveError("Legs are already displaced");
        }

        const position_above = {
            x: position.x,
            y: position.y + 1,
            z: position.z,
        };

        const cell_above = this.get_cell(position_above);

        if (
            cell_above?.legs === LegsState.Extended ||
            cell_above?.legs === LegsState.Extending ||
            cell_above?.legs === LegsState.Retracting
        ) {
            throw new MoveError("Legs are blocked from displacing");
        }

        cell.legs = LegsState.Displaced;
    }

    /**
     * Withdraw the legs of a box, moving them back into its body. This can
     * only be done if the box is a Type 2 box, and its legs are displaced.
     * This action is instantaneous, and does not have a pending state.
     *
     * @param id - The id of the box which should withdraw its legs.
     *
     * @throws {MoveError} If the box cannot withdraw its legs.
     */
    withdraw_legs(id: number) {
        if (this.box_type !== BoxType.Type2) {
            throw new MoveError("Box type must be Type2");
        }

        const position = this.grid.box_position(id);

        if (position === null) {
            throw new MoveError("Box does not exist");
        }

        const cell = this.get_cell(position);

        if (cell === null) {
            throw new Error("Box not found");
        }

        if (cell.type !== CellType.Stationary) {
            throw new MoveError("Box must be stationary");
        }

        if (cell.legs !== LegsState.Displaced) {
            if (cell.legs === LegsState.Withdrawn) {
                throw new MoveError("Legs are already withdrawn");
            } else {
                throw new MoveError(
                    "Legs must be retracted before they can be withdrawn",
                );
            }
        }

        const cell_above = this.get_cell({
            x: position.x,
            y: position.y + 1,
            z: position.z,
        });

        if (cell_above === null || cell_above.type !== CellType.Stationary) {
            const cell_two_above = this.get_cell({
                x: position.x,
                y: position.y + 2,
                z: position.z,
            });

            if (
                cell_two_above?.legs === LegsState.Extended ||
                cell_two_above?.legs === LegsState.Extending ||
                cell_above?.legs === LegsState.Retracting
            ) {
                throw new MoveError(
                    "Withdrawing legs would leave an above box unsupported",
                );
            }
        }

        cell.legs = LegsState.Withdrawn;
    }

    /**
     * Returns whether the end state has been reached.
     *
     * @param end_state - The end state.
     */
    end_state_reached(end_state: Cube[]): boolean {
        return end_state.every((cube) => {
            const position = this.grid.box_position(cube.id);

            return (
                position &&
                position.x === cube.x &&
                position.y === cube.y &&
                position.z === cube.z &&
                this.get_cell(position)?.type === CellType.Stationary
            );
        });
    }

    /**
     * Extends the legs of a box and pushes it upwards a cell.
     */
    private push_upwards(position: Position, cell: Cell) {
        const stack_height = this.stack_height(position.x, position.z);

        this.check_boxes_above(position);

        if (stack_height === this.height) {
            throw new MoveError("Cannot extend legs when stack is full");
        }

        // vertical type2 energy cost = number of boxes ontop including box itself
        const box_num = stack_height - position.y;
        this.energy_used += box_num;

        cell.legs = LegsState.Extending;

        for (let i = stack_height - 1; i >= position.y; i--) {
            const from = {
                x: position.x,
                y: i,
                z: position.z,
            };

            const to = {
                x: position.x,
                y: i + 1,
                z: position.z,
            };

            this.start_single_move(from, to);
        }
    }

    /**
     * If a box is going to extend or retract its legs, and that action will
     * push it upwards or downwards, this will move all the boxes above it as
     * well. Therefore, we need to check that there are no moving boxes above
     * it.
     *
     * @param position - The position of the box.
     */
    private check_boxes_above(position: Position) {
        const stack_height = this.stack_height(position.x, position.z);
        for (let i = position.y + 1; i < stack_height; i++) {
            const cell = this.get_cell({
                x: position.x,
                y: i,
                z: position.z,
            });

            if (cell?.type !== CellType.Stationary) {
                if (cell?.type === CellType.MovingTo) {
                    throw new MoveError(
                        "Cannot move legs when box is moving onto stack",
                    );
                } else {
                    throw new MoveError(
                        "Cannot move legs when box is moving off of stack",
                    );
                }
            }

            if (
                cell.legs === LegsState.Retracting ||
                cell.legs === LegsState.Extending
            ) {
                throw new MoveError(
                    "Cannot move legs when box above is also moving its legs",
                );
            }
        }
    }

    /**
     * Begins moving a box from one position to another, without any
     * validation. Call `finish_single_move()` to complete this action.
     */
    private start_single_move(from: Position, to: Position) {
        const from_cell = this.get_cell(from);
        const to_cell = this.get_cell(to);

        if (from_cell === null) {
            throw new Error("Box does not exist");
        }

        const id = from_cell.id;

        if (from_cell.type === CellType.Stationary) {
            // Sentinel cell that signifies that a box is moving out of this
            // cell. Technically, the id doesn't matter too much here.
            const cell = new Cell(id, CellType.MovingFrom);
            this.set_cell(from, cell);
        } else {
            throw new Error(`Unexpected cell type: ${from_cell.type}`);
        }

        // Move `from_cell` to the new position in order to preserve attributes
        // like `legs`
        if (to_cell === null) {
            from_cell.type = CellType.MovingTo;
            this.set_cell(to, from_cell);
        } else if (to_cell.type === CellType.MovingFrom) {
            from_cell.type = CellType.Switching;
            this.set_cell(to, from_cell);
        } else {
            throw new Error(`Unexpected cell type: ${to_cell.type}`);
        }

        this.grid.set_position(id, to);
    }

    /**
     * Finishes moving a box from one position to another. The complement of
     * `start_single_move()`.
     */
    private finish_single_move(from: Position, to: Position) {
        const from_cell = this.get_cell(from);
        const to_cell = this.get_cell(to);

        if (from_cell === null || to_cell === null) {
            throw new Error("Box does not exist");
        }

        if (from_cell.type === CellType.MovingFrom) {
            this.remove_cell(from);
        } else if (from_cell.type === CellType.Switching) {
            from_cell.type = CellType.MovingTo;
        } else {
            throw new Error(`Unexpected cell type: ${from_cell.type}`);
        }

        if (to_cell.type === CellType.MovingTo) {
            to_cell.type = CellType.Stationary;
        } else {
            throw new Error(`Unexpected cell type: ${to_cell.type}`);
        }
    }

    /**
     * Contains the logic common to Type 1 and Type 2 boxes when applying a
     * move.
     */
    private apply_horizontal_move(position: Position, new_position: Position) {
        const target_cell = this.get_cell(new_position);

        if (target_cell !== null && target_cell.type !== CellType.MovingFrom) {
            throw new MoveError("Move is blocked by another box");
        }

        if (new_position.y > 0) {
            const position_below = {
                x: new_position.x,
                y: new_position.y - 1,
                z: new_position.z,
            };

            const box_below = this.get_cell(position_below);

            if (box_below === null) {
                throw new MoveError("Box will not be supported underneath");
            }

            if (box_below.type !== CellType.Stationary) {
                throw new MoveError("Cannot move on top of a moving box");
            }
        }

        // horizontal move for any box type costs 1
        this.energy_used += 1;

        this.start_single_move(position, new_position);
    }

    private get_cell({ x, y, z }: Position): Cell | null {
        const stack = this.grid.stack_at(x, z);
        if (y >= stack.length) {
            return null;
        }

        return stack[y];
    }

    private set_cell({ x, y, z }: Position, cell: Cell) {
        const stack = this.grid.stack_at(x, z);
        stack[y] = cell;
    }

    private remove_cell(position: Position) {
        const stack = this.grid.stack_at(position.x, position.z);

        if (position.y === stack.length - 1) {
            stack.pop();
        } else {
            stack[position.y] = null;
        }
    }

    private stack_height(x: number, z: number): number {
        return this.grid.stack_at(x, z).length;
    }
}

/**
 * Thrown when a move is invalid.
 */
export class MoveError extends Error {
    constructor(message: string) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MoveError);
        }

        this.name = "MoveError";
    }
}

/**
 * Thrown when a scenario is invalid.
 */
export class ScenarioError extends Error {
    constructor(message: string) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ScenarioError);
        }

        this.name = "ScenarioError";
    }
}

// Allows for different implementations of the state (e.g. for efficiency in
// different scenarios).
interface Grid {
    stack_at(x: number, z: number): (Cell | null)[];

    box_position(id: number): Position | null;

    set_position(id: number, position: Position): void;

    get_cubes(): CubeState[];
}

/**
 * Represents the state of a box. A single point in the werehouse can either be
 * empty or be in one of these four states.
 *
 * - `Stationary`: The box is not moving.
 * - `MovingTo`: The box is moving to this point.
 * - `MovingFrom`: The box is moving from this point.
 * - `Switching`: One box is moving out of this point and another is moving to
 *   it. A combination of `MovingFrom` and `MovingTo`.
 */
enum CellType {
    Stationary,
    MovingTo,
    MovingFrom,
    Switching,
}

/**
 * Represents the state of the legs of a Type 2 box.
 *
 * `Withdrawn` is the initial state, and boxes can only move when their legs
 * are withdrawn.
 *
 * Boxes can transition from one state to another as follows:
 *
 *             `displace_legs()`                   `extend_legs()`                  `finish_extending_legs()`
 * `Withdrawn` <---------------> `Displaced` ------------------------> `Extending`  ------------------------> `Extended`
 *             `withdraw_legs()`             <------------------------ `Retracting` <------------------------
 *                                           `finish_retracting_legs()`                   `retract_legs()`
 */
enum LegsState {
    Withdrawn,
    Displaced,
    Extended,
    Extending,
    Retracting,
}

class Cell {
    id: number;
    type: CellType;
    legs: LegsState;

    constructor(id: number, type: CellType = CellType.Stationary) {
        this.id = id;
        this.type = type;
        this.legs = LegsState.Withdrawn;
    }
}

type Position = {
    x: number;
    y: number;
    z: number;
};

// TODO: This is going to be pretty fast, but could be inefficient memory wise,
// especially if the warehouse is large and sparse.
// A HashMap-based approach may be more efficient. Profile and test.

/**
 * An implementation of `Grid` that uses a 3D array to store the boxes.
 */
class ArrayGrid implements Grid {
    private width: number;
    private height: number;
    private depth: number;
    private box_type: BoxType;

    // A map of box ID -> position
    // Used to quickly retrieve the position of a box
    private box_map: Map<number, Position> = new Map();

    // PERF: It's faster to just use a 1D array to store a multi-dimensional
    // grid. See
    // https://stackoverflow.com/questions/17259877/1d-or-2d-array-whats-faster
    // However, since the boxes are stacked (a box can't float!), it's more
    // memory efficient to use an array for the stack of boxes at each (x, z)
    // position.
    //
    // TODO: Try using a 1D array instead.
    //
    // To get a box at (x, y, z): `grid[x * depth + z][y]`
    private grid: (Cell | null)[][];

    constructor(
        width: number,
        height: number,
        depth: number,
        box_type: BoxType,
    ) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.box_type = box_type;

        this.grid = new Array(width * depth);
        for (let i = 0; i < width * depth; i++) {
            this.grid[i] = new Array();
        }
    }

    static from_scenario(scenario: Scenario): ArrayGrid {
        const grid = new ArrayGrid(
            scenario.width,
            scenario.height,
            scenario.depth,
            scenario.box_type,
        );

        for (const box of scenario.start) {
            if (
                box.x < 0 ||
                box.x >= grid.width ||
                box.y < 0 ||
                box.y >= grid.height ||
                box.z < 0 ||
                box.z >= grid.depth
            ) {
                throw new ScenarioError(`Box ${box.id} is out of bounds`);
            } else if (grid.box_map.has(box.id)) {
                throw new ScenarioError(`Box ${box.id} already exists`);
            } else if (
                grid.grid[box.x * grid.depth + box.z][box.y] !== undefined
            ) {
                throw new ScenarioError(
                    `There is already a box at (${box.x}, ${box.y}, ${box.z})`,
                );
            }

            grid.set_position(box.id, { x: box.x, y: box.y, z: box.z });
            grid.grid[box.x * grid.depth + box.z][box.y] = new Cell(box.id);
        }

        // Check for floating boxes
        for (let x = 0; x < grid.width; x++) {
            for (let z = 0; z < grid.depth; z++) {
                const stack = grid.stack_at(x, z);

                for (const item of stack) {
                    if (item === undefined) {
                        throw new ScenarioError(`Floating box at (${x}, ${z})`);
                    }
                }
            }
        }

        return grid;
    }

    /** @override */
    stack_at(x: number, z: number): (Cell | null)[] {
        return this.grid[x * this.depth + z];
    }

    /** @override */
    box_position(id: number): Position | null {
        return this.box_map.get(id) ?? null;
    }

    /** @override */
    set_position(id: number, position: Position) {
        this.box_map.set(id, position);
    }

    /** @override */
    get_cubes(): CubeState[] {
        const state = [];
        for (const [id, position] of this.box_map.entries()) {
            if (this.box_type === BoxType.Type1) {
                state.push({
                    id: id,
                    x: position.x,
                    y: position.y,
                    z: position.z,
                });
            } else {
                const cell =
                    this.grid[position.x * this.depth + position.z][position.y];

                const legs_displaced = cell?.legs !== LegsState.Withdrawn;

                const legs_extended =
                    cell?.legs === LegsState.Extended ||
                    cell?.legs === LegsState.Extending;

                state.push({
                    id: id,
                    x: position.x,
                    y: position.y,
                    z: position.z,
                    legs_displaced,
                    legs_extended,
                });
            }
        }

        return state;
    }
}
