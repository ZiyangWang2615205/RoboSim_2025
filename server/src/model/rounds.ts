import {
    Action,
    CubeState,
    LegAction,
    MoveAction,
    Scenario,
    Move,
    ActionRecord,
    LegActionType,
} from "../types/index.js";
import { State, MoveError } from "./grid.js";

export interface RoundParams {
    /**
     * The scenario to be simulated.
     */
    scenario: Scenario;
    /**
     * The max amount of time to run this round until it is failed (in ms)
     */
    maxTime: number;
    /**
     * Called whenever a move set is accepted.
     */
    onAccepted: (action: Action) => void;
    /**
     * Called when a move finishes executing.
     */
    onExecuted: (action: Action) => void;
    /**
     * Called whenever an invalid move set is rejected.
     */
    onRejected: (action: Action, message: string) => void;
    /**
     * Called whenever the end state of the scenario is reached.
     */
    onEndStateReached: () => void;
    /**
     * Called when the algorithm client sends a skip message
     */
    skip: () => void;
    /**
     * Called whenever a scenario takes too long to complete
     */
    onScenarioFailed: () => void;
}

/**
 * Represents a single round of the simulation
 */
export class Round {
    private _scenario: Scenario;
    private state: State;

    start: number;
    private move_record: ActionRecord[] = [];
    private timeouts: Set<NodeJS.Timeout> = new Set();
    private move_duration: number = 1000;
    private _move_sent: boolean = false;

    // Callbacks
    onAccepted: (action: Action) => void;
    onExecuted: (action: Action) => void;
    onRejected: (action: Action, message: string) => void;
    onEndStateReached: () => void;
    skip: () => void;
    onScenarioFailed: () => void;

    constructor({
        scenario,
        maxTime,
        onAccepted,
        onExecuted,
        onRejected,
        onEndStateReached,
        skip,
        onScenarioFailed,
    }: RoundParams) {
        this._scenario = scenario;
        this.state = State.from_scenario(scenario);

        this.start = Date.now();

        if (process.env.NODE_ENV === "test") {
            this.move_duration = 10;
        }

        this.onAccepted = onAccepted;
        this.onExecuted = onExecuted;
        this.onRejected = onRejected;
        this.onEndStateReached = onEndStateReached;
        this.skip = skip;
        this.onScenarioFailed = onScenarioFailed;

        this.startFailTimer(maxTime);
    }

    /**
     * The scenario that the round simulates.
     */
    get scenario(): Scenario {
        return this._scenario;
    }

    get run(): Run {
        return {
            scenario: this.scenario,
            actions: this.move_record,
        };
    }

    clearTimeouts() {
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
    }

    // fail this round if time since round start exceeds maxTime ms
    private startFailTimer(maxTime: number) {
        const id = setTimeout(() => this.fail(), maxTime);
        this.timeouts.add(id);
    }

    public fail() {
        // clear any other outstanding timeouts
        for (const timeout of this.timeouts) {
            clearTimeout(timeout);
        }
        this.onScenarioFailed();
    }

    applyAction(action: Action) {
        if (action.kind === "move") {
            this.move(action);
        } else if (action.kind === "leg") {
            if (action.type === LegActionType.Displace) {
                this.displace_legs(action.id);
            } else if (action.type === LegActionType.Withdraw) {
                this.withdraw_legs(action.id);
            } else if (action.type === LegActionType.Extend) {
                this.extend_legs(action.id);
            } else if (action.type === LegActionType.Retract) {
                this.retract_legs(action.id);
            } else {
                throw new Error("Unrecognised leg action");
            }
        }
    }

    /**
     * Validate and apply a move to the state.
     */
    move(move: Move) {
        this._move_sent = true;

        const action: MoveAction = {
            kind: "move",
            id: move.id,
            dx: move.dx,
            dy: move.dy,
            dz: move.dz,
        };

        try {
            this.state.apply_move(move);
            this.onAccepted(action);

            this.move_record.push({
                time: Date.now() - this.start,
                action,
            });

            // After one second, finish executing the move
            const id = setTimeout(() => {
                this.timeouts.delete(id);
                this.state.finish_move(move);
                this.onExecuted(action);

                this.checkEndState();
            }, this.move_duration);

            this.timeouts.add(id);
        } catch (e) {
            if (e instanceof MoveError) {
                console.error(e.message);
                this.onRejected(action, e.message);
            } else {
                throw e;
            }
        }
    }

    private checkEndState() {
        if (this.state.end_state_reached(this.scenario.requirements)) {
            for (const timeout of this.timeouts) {
                clearTimeout(timeout);
            }

            this.onEndStateReached();
        }
    }

    displace_legs(id: number) {
        this._move_sent = true;

        const action: LegAction = {
            kind: "leg",
            type: LegActionType.Displace,
            id,
        };

        try {
            this.state.displace_legs(id);
            this.onAccepted(action);

            this.move_record.push({
                time: Date.now() - this.start,
                action,
            });

            this.onExecuted(action);
        } catch (e) {
            if (e instanceof MoveError) {
                console.error(e.message);
                this.onRejected(action, e.message);
            } else {
                throw e;
            }
        }
    }

    withdraw_legs(id: number) {
        this._move_sent = true;

        const action: LegAction = {
            kind: "leg",
            type: LegActionType.Withdraw,
            id,
        };

        try {
            this.state.withdraw_legs(id);
            this.onAccepted(action);

            this.move_record.push({
                time: Date.now() - this.start,
                action,
            });

            this.onExecuted(action);
        } catch (e) {
            if (e instanceof MoveError) {
                console.error(e.message);
                this.onRejected(action, e.message);
            } else {
                throw e;
            }
        }
    }

    extend_legs(id: number) {
        this._move_sent = true;

        const action: LegAction = {
            kind: "leg",
            type: LegActionType.Extend,
            id,
        };

        try {
            this.state.extend_legs(id);
            this.onAccepted(action);

            this.move_record.push({
                time: Date.now() - this.start,
                action,
            });

            // After one second, finish executing the move
            const timeoutId = setTimeout(() => {
                this.timeouts.delete(timeoutId);
                this.state.finish_extending_legs(id);
                this.onExecuted(action);

                this.checkEndState();
            }, this.move_duration);

            this.timeouts.add(timeoutId);
        } catch (e) {
            if (e instanceof MoveError) {
                console.error(e.message);
                this.onRejected(action, e.message);
            } else {
                throw e;
            }
        }
    }

    retract_legs(id: number) {
        this._move_sent = true;

        const action: LegAction = {
            kind: "leg",
            type: LegActionType.Retract,
            id,
        };

        try {
            this.state.retract_legs(id);
            this.onAccepted(action);

            this.move_record.push({
                time: Date.now() - this.start,
                action,
            });

            // After one second, finish executing the move
            const timeoutId = setTimeout(() => {
                this.timeouts.delete(timeoutId);
                this.state.finish_retracting_legs(id);
                this.onExecuted(action);

                this.checkEndState();
            }, this.move_duration);

            this.timeouts.add(timeoutId);
        } catch (e) {
            if (e instanceof MoveError) {
                console.error(e.message);
                this.onRejected(action, e.message);
            } else {
                throw e;
            }
        }
    }

    get cubes(): CubeState[] {
        return this.state.get_cubes();
    }

    /**
     * Whether at least one move has been sent by the algorithm client.
     */
    get move_sent(): boolean {
        return this._move_sent;
    }

    /**
     * Get the total energy used in the current state of the round.
     */
    public get_energy_used(): number {
        return this.state.get_energy_used();
    }
}

export type Run = {
    scenario: Scenario;
    actions: ActionRecord[];
};
